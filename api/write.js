export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    const { messageContent, lang } = req.body
    if (!messageContent || !Array.isArray(messageContent)) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const langNames = {
      ar: 'Arabic', tr: 'Turkish', fr: 'French', es: 'Spanish',
      ur: 'Urdu', fa: 'Persian', pt: 'Portuguese', hi: 'Hindi',
    }
    const langName = langNames[lang] || 'Arabic'

    const systemPrompt = `You are an expert English writing coach for ${langName} speakers. You help users improve their English writing.
Always structure your response clearly. When you show corrections or rewrites, use clear formatting.
Always include ${langName} explanations alongside English content.`

    // Convert Anthropic-style content array to a single text for Gemini
    const userText = messageContent.map(part => {
      if (typeof part === 'string') return part
      if (part.type === 'text') return part.text
      if (part.type === 'image_url') return '[image attached]'
      return ''
    }).join('\n')

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to help with English writing coaching.' }] },
      { role: 'user', parts: [{ text: userText }] },
    ]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } }),
      }
    )

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || response.statusText)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    res.json({ text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
