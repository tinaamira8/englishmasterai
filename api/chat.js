import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })

const AI_SYSTEM = `You are an expert English language tutor for Arabic speakers. Help Arabic-speaking learners improve their English.

Rules:
- Always respond in BOTH English AND Arabic
- Keep English explanations clear and simple
- Provide Arabic translations and explanations
- Be encouraging and patient
- Correct mistakes gently with explanations
- Give examples in context

Format:
**English:** [explanation/answer]
**بالعربية:** [Arabic translation/explanation]

Be supportive. Your goal is to build confidence in English.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    const { messages } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: AI_SYSTEM,
      messages,
    })

    res.json({ text: response.content[0].text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
