import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { password, action } = req.body
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2025'

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة' })
  }

  if (action === 'health') {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      })
      return res.json({ status: 'ok', message: 'Anthropic API تعمل بشكل طبيعي' })
    } catch (err) {
      return res.json({ status: 'error', message: err.message })
    }
  }

  if (action === 'info') {
    return res.json({
      node: process.version,
      region: process.env.VERCEL_REGION || 'unknown',
      deployment: process.env.VERCEL_URL || 'local',
      env: process.env.ANTHROPIC_KEY ? 'مفتاح API موجود ✓' : 'مفتاح API مفقود ✗',
    })
  }

  return res.status(400).json({ error: 'action غير معروف' })
}
