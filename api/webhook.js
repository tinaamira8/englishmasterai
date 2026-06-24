import Stripe from 'stripe'

let stripe, db

function getStripe() {
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return stripe
}

async function getDb() {
  if (!db) {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: 'englishmaster-68428',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
    }
    db = getFirestore()
  }
  return db
}

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

  try {
    const buf = await buffer(req)
    const sig = req.headers['stripe-signature']

    let event
    try {
      event = getStripe().webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature error: ${err.message}` })
    }

    const firestore = await getDb()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const uid = session.metadata?.uid
      if (uid) {
        await firestore.doc(`users/${uid}`).set({
          subscription: {
            status: 'active',
            plan: session.metadata?.plan || 'monthly',
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
      const customers = await firestore.collection('users').where('subscription.stripeCustomerId', '==', sub.customer).get()
      for (const doc of customers.docs) {
        await doc.ref.set({
          subscription: { status: 'cancelled', cancelledAt: Date.now() },
          updatedAt: Date.now(),
        }, { merge: true })
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: err.message })
  }
}
