// Fonction serverless Vercel : /api/verify-session
// Vérifie auprès de Stripe qu'une session de paiement a bien été payée,
// avant de dire au navigateur qu'il peut débloquer le contenu premium.
//
// Nécessite la variable d'environnement STRIPE_SECRET_KEY, à ajouter dans
// Vercel : Project Settings -> Environment Variables.

export default async function handler(req, res) {
  const sessionId = req.query.session_id;

  if (!sessionId) {
    res.status(400).json({ paid: false, error: "session_id manquant" });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ paid: false, error: "Clé Stripe non configurée sur le serveur" });
    return;
  }

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    if (!response.ok) {
      res.status(200).json({ paid: false, error: "Session introuvable" });
      return;
    }

    const session = await response.json();
    // "paid" ou "no_payment_required" indiquent un paiement validé côté Stripe.
    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";

    res.status(200).json({ paid });
  } catch (err) {
    res.status(200).json({ paid: false, error: "Erreur de vérification" });
  }
}
