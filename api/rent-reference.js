
const DATASET_PAGE =
  "https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025";

const RESOURCES = {
  apartment_all: "55b34088-0964-415f-9df7-d87dd98a09be",
  apartment_small: "14a1fe11-b2d1-49b3-9f6b-83d12df9482c",
  apartment_large: "5e3b28a4-cf56-43a3-ae79-43cceeb27f8c",
  house: "129f764d-b613-44e4-952c-5ff50a8c9b73"
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  const number = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function detectDelimiter(line) {
  const candidates = [";", ",", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseCsv(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = detectDelimiter(lines[0]);

  const parseLine = (line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === delimiter && !quoted) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  };

  const headers = parseLine(lines[0]).map((header) => normalize(header).replace(/\s/g, "_"));
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function firstValue(row, candidates) {
  for (const candidate of candidates) {
    if (row[candidate] !== undefined && row[candidate] !== "") return row[candidate];
  }
  return null;
}

function chooseResource(propertyType, rooms) {
  if (propertyType === "house") {
    return {
      key: "house",
      id: RESOURCES.house,
      label: "Maison type"
    };
  }

  if (Number(rooms) >= 3) {
    return {
      key: "apartment_large",
      id: RESOURCES.apartment_large,
      label: "Appartement T3 et plus"
    };
  }

  if (Number(rooms) > 0 && Number(rooms) <= 2) {
    return {
      key: "apartment_small",
      id: RESOURCES.apartment_small,
      label: "Appartement T1-T2"
    };
  }

  return {
    key: "apartment_all",
    id: RESOURCES.apartment_all,
    label: "Appartement toutes typologies"
  };
}

async function loadRows(resource) {
  const cached = cache.get(resource.key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.rows;

  const response = await fetch(`https://www.data.gouv.fr/api/1/datasets/r/${resource.id}`, {
    headers: { "User-Agent": "Renta-Locative/1.0" },
    redirect: "follow"
  });

  if (!response.ok) throw new Error(`Source officielle indisponible (${response.status})`);
  const text = await response.text();
  const rows = parseCsv(text);
  if (!rows.length) throw new Error("Fichier officiel vide ou format inattendu");

  cache.set(resource.key, { rows, createdAt: Date.now() });
  return rows;
}

function findCityRow(rows, city) {
  const target = normalize(city);

  const cityCandidates = [
    "libgeo", "libelle_commune", "nom_commune", "commune", "libcom",
    "nom", "libelle", "libelle_geographique"
  ];

  const exact = rows.find((row) => {
    const value = firstValue(row, cityCandidates);
    return value && normalize(value) === target;
  });
  if (exact) return exact;

  return rows.find((row) => {
    const value = firstValue(row, cityCandidates);
    const normalized = normalize(value);
    return normalized && (normalized.includes(target) || target.includes(normalized));
  });
}

function extractRent(row) {
  const candidates = [
    "loypredm2", "loyer_m2", "loyer_mensuel_m2", "loyer_par_m2",
    "prix_m2", "pred", "prediction", "loyer", "loypred"
  ];

  for (const key of candidates) {
    const value = parseNumber(row[key]);
    if (value && value > 3 && value < 80) return value;
  }

  for (const [key, raw] of Object.entries(row)) {
    if (!/(loy|rent|pred).*(m2|m_2|metre)|m2.*(loy|rent|pred)/i.test(key)) continue;
    const value = parseNumber(raw);
    if (value && value > 3 && value < 80) return value;
  }

  return null;
}

function extractQuality(row) {
  const r2 = parseNumber(firstValue(row, ["r2", "r2adj", "r2_ajuste", "coefficient_determination"]));
  const observations = parseNumber(firstValue(row, ["nbobs", "nb_obs", "nombre_observations", "observations"]));
  const lower = parseNumber(firstValue(row, ["loypredm2_inf", "borne_inf", "intervalle_bas", "lwr_ipm2"]));
  const upper = parseNumber(firstValue(row, ["loypredm2_sup", "borne_sup", "intervalle_haut", "upr_ipm2"]));

  let level = "prudente";
  if ((r2 === null || r2 >= 0.5) && (observations === null || observations >= 30)) level = "moyenne";
  if (r2 !== null && r2 >= 0.7 && observations !== null && observations >= 100) level = "bonne";

  return { r2, observations, lower, upper, level };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const city = String(req.body?.city || "").trim();
    const propertyType = req.body?.propertyType === "house" ? "house" : "apartment";
    const rooms = Number(req.body?.rooms || 0);

    if (!city || city === "Ville à confirmer") {
      return res.status(400).json({ error: "Commune non détectée" });
    }

    const resource = chooseResource(propertyType, rooms);
    const rows = await loadRows(resource);
    const row = findCityRow(rows, city);

    if (!row) {
      return res.status(404).json({
        error: `Aucune référence communale trouvée pour ${city}`,
        sourceUrl: DATASET_PAGE
      });
    }

    const rentPerM2 = extractRent(row);
    if (!rentPerM2) {
      return res.status(422).json({
        error: "La ligne officielle a été trouvée, mais la valeur de loyer n’a pas pu être lue",
        sourceUrl: DATASET_PAGE
      });
    }

    const cityLabel =
      firstValue(row, ["libgeo", "libelle_commune", "nom_commune", "commune", "libcom", "nom"]) || city;
    const inseeCode =
      firstValue(row, ["codgeo", "code_insee", "insee_com", "code_commune", "depcom"]) || null;
    const quality = extractQuality(row);

    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({
      rentPerM2: Math.round(rentPerM2 * 10) / 10,
      cityLabel,
      inseeCode,
      propertyType,
      typologyLabel: resource.label,
      year: 2025,
      chargesIncluded: true,
      furnished: false,
      quality,
      sourceLabel: "Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin",
      sourceUrl: DATASET_PAGE,
      methodology:
        "Indicateur communal de loyer d’annonce charges comprises pour un bien type non meublé mis en location au 3e trimestre 2025."
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Impossible d’interroger la source officielle",
      sourceUrl: DATASET_PAGE
    });
  }
}
