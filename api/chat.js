const LANG_NAMES = {
  ar: 'Arabic', tr: 'Turkish', fr: 'French', es: 'Spanish',
  ur: 'Urdu', fa: 'Persian', pt: 'Portuguese', hi: 'Hindi',
}

function getSystemPrompt(lang) {
  const name = LANG_NAMES[lang] || 'Arabic'
  return `You are an expert English language tutor for ${name} speakers. Help learners improve their English.

Rules:
- Always respond in BOTH English AND ${name}
- Keep English explanations clear and simple
- Provide ${name} translations and explanations
- Be encouraging and patient
- Correct mistakes gently with explanations
- Give examples in context

Format:
**English:** [explanation/answer]
**${name}:** [${name} translation/explanation]

Be supportive. Your goal is to build confidence in English.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  try {
    const { messages, lang } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const systemPrompt = getSystemPrompt(lang || 'ar')

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to help.' }] },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      })),
    ]

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 1024 } }),
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
