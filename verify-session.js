
export default async function handler(req, res) {
  res.status(200).json({ paid: false, message: "Branchez ici la vérification Stripe côté serveur." });
}
