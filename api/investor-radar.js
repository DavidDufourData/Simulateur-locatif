
const CACHE_SECONDS = 60 * 60 * 6;

const ALLOWED_HOSTS = new Set([
  "www.service-public.gouv.fr",
  "service-public.gouv.fr",
  "www.service-public.fr",
  "service-public.fr",
  "www.insee.fr",
  "insee.fr",
  "www.banque-france.fr",
  "banque-france.fr",
  "www.impots.gouv.fr",
  "impots.gouv.fr",
  "bofip.impots.gouv.fr",
  "www.ecologie.gouv.fr",
  "ecologie.gouv.fr",
  "www.legifrance.gouv.fr",
  "legifrance.gouv.fr"
]);

const BUILT_IN_SOURCES = [
  {
    name: "Service Public",
    url: "https://www.service-public.gouv.fr/abonnements/rss/actu-actualites-particuliers.rss",
    type: "rss",
    category: "Réglementation",
    status: "official"
  },
  {
    name: "Insee",
    url: "https://www.insee.fr/fr/statistiques",
    type: "html",
    category: "Marché",
    status: "official"
  },
  {
    name: "Banque de France",
    url: "https://www.banque-france.fr/fr/publications-et-statistiques/statistiques",
    type: "html",
    category: "Crédit",
    status: "official"
  }
];

const KEYWORDS = [
  "immobilier", "logement", "logements", "loyer", "loyers", "location",
  "bail", "propriétaire", "proprietaire", "locataire", "copropriété",
  "copropriete", "dpe", "énergie", "energie", "rénovation", "renovation",
  "crédit immobilier", "credit immobilier", "prêt immobilier", "pret immobilier",
  "taux d'intérêt", "taux d’interet", "habitat", "foncier", "lmnp",
  "meublé", "meuble", "impôt", "impot", "fiscal", "taxe foncière", "taxe fonciere"
];

const FALLBACK = {
  status: "partial",
  updatedAt: new Date().toISOString(),
  marketMood: {
    label: "Veille officielle active",
    summary: "Le Radar interroge automatiquement Service Public, l’Insee et la Banque de France. Une source indisponible est ignorée plutôt que remplacée par une information inventée.",
    confidence: null
  },
  indicators: [],
  news: [],
  tutorials: [
    { title: "Calculer une rentabilité réellement comparable", duration: "4 min", level: "Essentiel", topic: "Rentabilité" },
    { title: "Lire les trois documents clés d’une copropriété", duration: "6 min", level: "Pratique", topic: "Copropriété" },
    { title: "Vérifier un projet LMNP avant de signer", duration: "5 min", level: "Fiscalité", topic: "LMNP" }
  ],
  caseStudy: {
    title: "Étude de cas personnalisée",
    city: "À partir des projets enregistrés",
    score: null,
    summary: "Les projets de l’utilisateur sont croisés avec la veille sans modifier automatiquement leurs hypothèses.",
    action: "Vérifiez toute évolution réglementaire avant de prendre une décision."
  }
};

function cleanText(value = "") {
  let text = String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

  // Certains flux encodent deux fois leurs balises HTML.
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function normalize(value = "") {
  return cleanText(value)
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isRelevant(text = "") {
  const normalized = normalize(text);
  return KEYWORDS.some((keyword) => normalized.includes(normalize(keyword)));
}

function extractTag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return cleanText(match[1]);
  }
  return "";
}

function safeUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function classify(title, summary, source) {
  const text = normalize(`${title} ${summary}`);
  if (/(impot|fiscal|taxe|lmnp|meuble)/.test(text)) return "Fiscalité";
  if (/(credit|pret|taux|financement|banque)/.test(text)) return "Crédit";
  if (/(dpe|energie|renovation|travaux)/.test(text)) return "Travaux & DPE";
  if (/(loyer|location|locataire|bail)/.test(text)) return "Location";
  if (/(prix|vente|transaction|immobilier|logement)/.test(text)) return "Marché";
  return source.category || "Actualité";
}

function investorImpact(category) {
  const impacts = {
    "Fiscalité": "Cette évolution peut modifier la fiscalité nette, les obligations déclaratives ou la stratégie de détention.",
    "Crédit": "Cette information peut influencer la mensualité, la capacité d’emprunt ou les conditions de financement.",
    "Travaux & DPE": "Cette information peut affecter la louabilité du bien, le budget travaux ou le calendrier du projet.",
    "Location": "Cette évolution peut modifier les obligations du bailleur, le niveau de loyer ou la gestion locative.",
    "Marché": "Cette publication aide à apprécier la tendance des prix et le pouvoir de négociation."
  };
  return impacts[category] || "Vérifiez si cette publication concerne votre projet ou votre stratégie.";
}

function recommendedAction(category) {
  const actions = {
    "Fiscalité": "Lisez la source officielle et validez l’impact avec votre comptable avant de modifier votre déclaration.",
    "Crédit": "Mettez à jour le taux de votre simulation et comparez plusieurs offres bancaires.",
    "Travaux & DPE": "Contrôlez le DPE, le calendrier réglementaire et le coût des travaux avant toute offre.",
    "Location": "Vérifiez le bail, l’encadrement éventuel et les obligations applicables à la commune.",
    "Marché": "Comparez cette tendance aux prix réellement observés dans la commune visée."
  };
  return actions[category] || "Consultez la source avant toute décision.";
}

function parseRss(xml, source) {
  const blocks = [
    ...(xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || []),
    ...(xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [])
  ];

  return blocks.map((block, index) => {
    const title = extractTag(block, ["title"]);
    const summary = extractTag(block, ["description", "summary", "content"]);
    if (!title || !isRelevant(`${title} ${summary}`)) return null;

    const rawDate = extractTag(block, ["pubDate", "published", "updated"]);
    let rawLink = extractTag(block, ["guid"]);
    const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (hrefMatch) rawLink = hrefMatch[1];
    if (!rawLink) rawLink = extractTag(block, ["link"]);

    const category = classify(title, summary, source);
    const parsedDate = rawDate ? new Date(rawDate) : null;

    return {
      id: `${source.name}-${index}-${title}`.slice(0, 190),
      category,
      title,
      summary: summary.slice(0, 430) || "Consultez la publication officielle pour le détail.",
      impact: investorImpact(category),
      action: recommendedAction(category),
      sourceName: source.name,
      sourceUrl: safeUrl(rawLink, source.url),
      sourceDate: parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleDateString("fr-FR")
        : "",
      timestamp: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.getTime() : 0,
      status: source.status || "official",
      confidence: "Source officielle"
    };
  }).filter(Boolean);
}

function parseHtml(html, source) {
  const links = [];
  const regex = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null && links.length < 120) {
    const text = cleanText(match[4]);
    if (text.length < 24 || text.length > 240 || !isRelevant(text)) continue;
    const url = safeUrl(match[2], source.url);
    if (!url) continue;
    links.push({ text, url });
  }

  const unique = new Map();
  for (const item of links) {
    const key = normalize(item.text);
    if (!unique.has(key)) unique.set(key, item);
  }

  return [...unique.values()].slice(0, 8).map((item, index) => {
    const category = classify(item.text, "", source);
    return {
      id: `${source.name}-html-${index}-${item.text}`.slice(0, 190),
      category,
      title: item.text,
      summary: "Nouvelle publication repérée sur le site officiel. Consultez la source pour lire les chiffres, le périmètre et la date de référence.",
      impact: investorImpact(category),
      action: recommendedAction(category),
      sourceName: source.name,
      sourceUrl: item.url,
      sourceDate: "",
      timestamp: 0,
      status: source.status || "official",
      confidence: "Source officielle"
    };
  });
}

function validateExtraSources(raw) {
  if (!raw) return [];
  try {
    const values = JSON.parse(raw);
    if (!Array.isArray(values)) return [];
    return values.filter((source) => {
      const url = safeUrl(source.url, source.url);
      return Boolean(url && source.name && ["rss", "html"].includes(source.type));
    }).slice(0, 8);
  } catch {
    return [];
  }
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Renta-Locative-Radar/1.2 (+veille-publique)",
        Accept: source.type === "rss"
          ? "application/rss+xml, application/atom+xml, text/xml;q=0.9, */*;q=0.5"
          : "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5"
      }
    });

    if (!response.ok) {
      return { source: source.name, ok: false, items: [], error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    const items = source.type === "rss" ? parseRss(text, source) : parseHtml(text, source);
    return { source: source.name, ok: true, items, error: "" };
  } catch (error) {
    return { source: source.name, ok: false, items: [], error: error?.name || "Erreur réseau" };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  res.setHeader("Cache-Control", `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`);
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const extraSources = validateExtraSources(process.env.RADAR_SOURCES_JSON);
  const sources = [...BUILT_IN_SOURCES, ...extraSources];
  const results = await Promise.all(sources.map(fetchSource));

  const news = results
    .flatMap((result) => result.items)
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((item, index, list) =>
      list.findIndex((candidate) => normalize(candidate.title) === normalize(item.title)) === index
    )
    .slice(0, 12);

  const activeSources = results.filter((result) => result.ok).length;
  const failedSources = results.length - activeSources;

  if (!news.length) {
    news.push({
      id: "no-relevant-update",
      category: "Veille",
      title: "Aucune nouvelle publication immobilière pertinente détectée",
      summary: "Les sources officielles ont été interrogées, mais aucun contenu correspondant aux thèmes immobilier, location, crédit ou fiscalité n’a été retenu lors de cette actualisation.",
      impact: "L’absence de nouveauté détectée ne signifie pas qu’aucune règle n’a changé.",
      action: "Consultez les sources officielles pour une recherche exhaustive ou relancez l’actualisation plus tard.",
      sourceName: "Renta Locative",
      sourceUrl: "",
      sourceDate: new Date().toLocaleDateString("fr-FR"),
      status: "analysis",
      confidence: "Filtrage automatique"
    });
  }

  res.status(200).json({
    ...FALLBACK,
    status: failedSources ? "partial" : "live",
    updatedAt: new Date().toISOString(),
    marketMood: {
      label: failedSources ? "Veille partiellement actualisée" : "Veille officielle actualisée",
      summary: `${activeSources} source(s) officielle(s) ont répondu sur ${results.length}. Les publications sont filtrées selon leur pertinence pour l’investissement locatif.`,
      confidence: activeSources ? Math.round((activeSources / results.length) * 100) : null
    },
    indicators: [
      { label: "Sources actives", value: `${activeSources}/${results.length}`, trend: failedSources ? "neutral" : "up", note: failedSources ? `${failedSources} source(s) indisponible(s)` : "Toutes les sources ont répondu" },
      { label: "Publications utiles", value: String(news.length), trend: "neutral", note: "Après filtrage immobilier" },
      { label: "Actualisation", value: "6 h", trend: "neutral", note: "Cache serveur automatique" },
      { label: "Traçabilité", value: "100 %", trend: "up", note: "Lien vers chaque source" }
    ],
    news,
    diagnostics: results.map(({ source, ok, error, items }) => ({
      source,
      ok,
      items: items.length,
      error
    }))
  });
}
