const LANG_NAMES = {
  ar: 'Arabic', tr: 'Turkish', fr: 'French', es: 'Spanish',
  ur: 'Urdu', fa: 'Persian', pt: 'Portuguese', hi: 'Hindi',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    const { messageContent, lang } = req.body
    if (!messageContent || !Array.isArray(messageContent)) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const langName = LANG_NAMES[lang] || 'Arabic'

    const userText = messageContent.map(part => {
      if (part.type === 'text') return part.text
      if (part.type === 'image') return '[image attached — describe and analyze any English text visible]'
      return ''
    }).filter(Boolean).join('\n')

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: `You are an expert English writing coach for ${langName} speakers. Help users improve their English writing. Always structure your response clearly with formatting. Always include ${langName} explanations alongside English content.`,
          },
          { role: 'user', content: userText },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || response.statusText)

    const text = data.choices?.[0]?.message?.content || ''
    res.json({ text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
}
