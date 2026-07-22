export default async function handler(req, res) {
  const { session_id } = req.query || {};
  if (!session_id || !process.env.STRIPE_SECRET_KEY) return res.status(400).json({ paid:false });
  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
    });
    if (!response.ok) return res.status(502).json({ paid:false });
    const session = await response.json();
    return res.status(200).json({ paid: session.payment_status === 'paid' || session.status === 'complete' });
  } catch { return res.status(500).json({ paid:false }); }
}
