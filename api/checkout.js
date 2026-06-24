import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { uid, email, plan } = req.body
    if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' })

    const isLifetime = plan === 'lifetime'

    const priceId = plan === 'yearly'
      ? process.env.STRIPE_PRICE_YEARLY
      : plan === 'lifetime'
        ? process.env.STRIPE_PRICE_LIFETIME
        : process.env.STRIPE_PRICE_MONTHLY

    if (!priceId) return res.status(400).json({ error: `Missing price ID for plan: ${plan}` })

    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      metadata: { uid, plan },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin || 'https://englishmasterai.com'}/?sub=success`,
      cancel_url: `${req.headers.origin || 'https://englishmasterai.com'}/?sub=cancel`,
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
