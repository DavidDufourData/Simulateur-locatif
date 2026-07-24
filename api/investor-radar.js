
const CACHE_SECONDS = 60 * 60 * 6;
const ALLOWED_HOSTS = new Set([
  "www.banque-france.fr",
  "banque-france.fr",
  "www.insee.fr",
  "insee.fr",
  "www.service-public.fr",
  "service-public.fr",
  "www.impots.gouv.fr",
  "impots.gouv.fr",
  "bofip.impots.gouv.fr",
  "www.ecologie.gouv.fr",
  "ecologie.gouv.fr",
  "www.legifrance.gouv.fr",
  "legifrance.gouv.fr"
]);

const SAFE_FALLBACK = {
  status: "setup_required",
  updatedAt: new Date().toISOString(),
  marketMood: {
    label: "Sources à connecter",
    summary: "Aucune donnée de marché n’est publiée tant qu’elle n’est pas reliée à une source officielle datée.",
    confidence: null
  },
  indicators: [
    { label: "Crédit", value: "Non disponible", trend: "neutral", note: "Banque de France à connecter" },
    { label: "Prix", value: "Non disponible", trend: "neutral", note: "Insee ou DVF à connecter" },
    { label: "Location", value: "Non disponible", trend: "neutral", note: "Source locale à configurer" },
    { label: "Fiscalité", value: "Veille prête", trend: "neutral", note: "BOFiP, impots.gouv.fr et Service-Public" }
  ],
  news: [{
    id: "configuration",
    category: "Configuration",
    title: "Le Radar attend ses sources officielles",
    summary: "Le module refuse volontairement de fabriquer des chiffres ou des règles. Configurez les flux autorisés pour activer la veille automatique.",
    impact: "Les utilisateurs ne voient pas d’information potentiellement trompeuse.",
    action: "Ajoutez la variable RADAR_SOURCES_JSON dans votre hébergement.",
    sourceName: "Renta Locative",
    sourceUrl: "",
    sourceDate: "",
    status: "analysis",
    confidence: "—"
  }],
  tutorials: [
    { title: "Calculer une rentabilité réellement comparable", duration: "4 min", level: "Essentiel", topic: "Rentabilité" },
    { title: "Lire les trois documents clés d’une copropriété", duration: "6 min", level: "Pratique", topic: "Copropriété" },
    { title: "Vérifier un projet LMNP avant de signer", duration: "5 min", level: "Fiscalité", topic: "LMNP" }
  ],
  caseStudy: {
    title: "Étude de cas personnalisée",
    city: "À partir des projets enregistrés",
    score: null,
    summary: "La page peut croiser la veille avec les projets de l’utilisateur sans inventer de résultat.",
    action: "La personnalisation avancée sera calculée côté application."
  }
};

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeXml(match[1]);
  }
  return "";
}

function parseFeed(xml, source) {
  const blocks = [
    ...(xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || []),
    ...(xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [])
  ];
  return blocks.slice(0, 8).map((block, index) => {
    const title = tag(block, ["title"]);
    const summary = tag(block, ["description", "summary", "content"]);
    const date = tag(block, ["pubDate", "published", "updated"]);
    let link = tag(block, ["link", "guid"]);
    if (!link) {
      const href = block.match(/<link[^>]+href=["']([^"']+)["']/i);
      link = href?.[1] || source.url;
    }
    return {
      id: `${source.name}-${index}-${title}`.slice(0, 180),
      category: source.category || "Actualité",
      title: title || "Mise à jour officielle",
      summary: summary || "Consultez la publication officielle pour le détail.",
      impact: source.defaultImpact || "Vérifiez si cette évolution concerne votre stratégie ou vos projets.",
      action: "Consultez la source avant toute décision.",
      sourceName: source.name,
      sourceUrl: link,
      sourceDate: date ? new Date(date).toLocaleDateString("fr-FR") : "",
      status: source.status || "official",
      confidence: "Source officielle"
    };
  });
}

function validateSources(raw) {
  if (!raw) return [];
  let sources;
  try {
    sources = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(sources)) return [];
  return sources.filter((source) => {
    try {
      const url = new URL(source.url);
      return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) && source.name;
    } catch {
      return false;
    }
  }).slice(0, 12);
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: { "User-Agent": "Renta-Locative-Radar/1.0", Accept: "application/rss+xml, application/atom+xml, text/xml, text/html" }
    });
    if (!response.ok) return [];
    const text = await response.text();
    return parseFeed(text, source);
  } catch {
    return [];
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

  const sources = validateSources(process.env.RADAR_SOURCES_JSON);
  if (!sources.length) {
    res.status(200).json(SAFE_FALLBACK);
    return;
  }

  const results = await Promise.all(sources.map(fetchSource));
  const news = results.flat().filter((item) => item.title).slice(0, 12);

  if (!news.length) {
    res.status(200).json({
      ...SAFE_FALLBACK,
      updatedAt: new Date().toISOString(),
      news: [{
        ...SAFE_FALLBACK.news[0],
        id: "sources-unavailable",
        title: "Sources momentanément indisponibles",
        summary: "Les sources configurées n’ont pas répondu. Le Radar n’a publié aucune information non vérifiée.",
        action: "Réessayez plus tard ou vérifiez les adresses des flux."
      }]
    });
    return;
  }

  res.status(200).json({
    status: "live",
    updatedAt: new Date().toISOString(),
    marketMood: {
      label: "Veille officielle actualisée",
      summary: "Les dernières publications des sources configurées sont disponibles ci-dessous. Aucun indice global n’est calculé sans données statistiques structurées.",
      confidence: 100
    },
    indicators: [
      { label: "Sources actives", value: String(sources.length), trend: "neutral", note: "Domaines officiels autorisés" },
      { label: "Publications", value: String(news.length), trend: "neutral", note: "Derniers contenus collectés" },
      { label: "Traçabilité", value: "100 %", trend: "up", note: "Chaque information conserve sa source" },
      { label: "Actualisation", value: "6 h", trend: "neutral", note: "Cache serveur anti-surconsommation" }
    ],
    news,
    tutorials: SAFE_FALLBACK.tutorials,
    caseStudy: SAFE_FALLBACK.caseStudy
  });
}
