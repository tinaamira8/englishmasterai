import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: 'englishmaster-68428',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
const db = getFirestore()

export const config = { api: { bodyParser: false } }

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readable.on('data', c => chunks.push(typeof c === 'string' ? Buffer.from(c) : c))
    readable.on('end', () => resolve(Buffer.concat(chunks)))
    readable.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const uid = session.metadata?.uid
    if (uid) {
      await db.doc(`users/${uid}`).set({
        subscription: {
          status: 'active',
          plan: 'monthly',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          startedAt: Date.now(),
        },
        updatedAt: Date.now(),
      }, { merge: true })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const customers = await db.collection('users').where('subscription.stripeCustomerId', '==', sub.customer).get()
    customers.forEach(async (doc) => {
      await doc.ref.set({
        subscription: { status: 'cancelled', cancelledAt: Date.now() },
        updatedAt: Date.now(),
      }, { merge: true })
    })
  }

  res.json({ received: true })
}
