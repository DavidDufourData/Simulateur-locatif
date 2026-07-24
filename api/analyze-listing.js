// Fonction serverless Vercel : /api/analyze-listing
//
// Reçoit le texte d'une annonce immobilière, demande à l'API OpenAI d'en
// extraire les données structurées (prix, surface, DPE, etc.), et renvoie
// ces champs bruts au front-end. Le calcul financier (rendement, score,
// verdict) reste fait côté client par le même moteur déterministe utilisé
// par le mode de secours local — l'IA ne sert qu'à mieux LIRE le texte,
// pas à faire les calculs financiers.
//
// Nécessite la variable d'environnement OPENAI_API_KEY, à ajouter dans
// Vercel : Project Settings -> Environment Variables.

const SYSTEM_PROMPT = `Tu extrais des informations structurées à partir du texte d'une annonce immobilière française.

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, exactement dans ce format :
{
  "price": nombre en euros ou null si absent du texte,
  "surface": nombre en m² ou null,
  "estimatedRent": nombre en euros par mois si un loyer est mentionné, sinon null,
  "monthlyCharges": nombre en euros par mois ou null,
  "propertyTax": nombre en euros par an ou null,
  "rooms": nombre de pièces (ex: 2 pour un T2/F2) ou null,
  "city": nom de la ville ou null,
  "dpe": une lettre A à G ou null,
  "hasWorks": booléen (travaux nécessaires ou état dégradé mentionné),
  "isRenovated": booléen (rénové, refait à neuf, ou excellent état mentionné),
  "hasElevator": booléen,
  "hasParking": booléen (parking, garage ou stationnement),
  "hasBalcony": booléen (balcon, terrasse ou jardin),
  "rented": booléen (vendu loué ou locataire déjà en place)
}

Règles importantes :
- Si une information n'est pas présente ou pas claire dans le texte, mets null (ou false pour les booléens). N'invente jamais de valeur approximative.
- Base-toi uniquement sur le texte fourni, pas sur des connaissances générales du marché immobilier.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: true, message: "Méthode non autorisée" });
    return;
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string" || text.trim().length < 25) {
    res.status(400).json({ error: true, message: "Texte trop court" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(200).json({ error: true, message: "Clé OpenAI non configurée sur le serveur" });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 4000) },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });

    if (!response.ok) {
      res.status(200).json({ error: true, message: "Erreur API OpenAI" });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      res.status(200).json({ error: true, message: "Réponse vide" });
      return;
    }

    let fields;
    try {
      fields = JSON.parse(content);
    } catch {
      res.status(200).json({ error: true, message: "Réponse JSON invalide" });
      return;
    }

    res.status(200).json({ error: false, fields });
  } catch (err) {
    res.status(200).json({ error: true, message: "Erreur serveur" });
  }
}
