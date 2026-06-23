import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    const { messageContent } = req.body
    if (!messageContent || !Array.isArray(messageContent)) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: `You are an expert English writing coach for Arabic speakers. You help users improve their English writing.
Always structure your response clearly. When you show corrections or rewrites, use clear formatting.
Always include Arabic explanations alongside English content.`,
      messages: [{ role: 'user', content: messageContent }],
    })

    res.json({ text: response.content[0].text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
