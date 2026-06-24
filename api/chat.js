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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: getSystemPrompt(lang || 'ar') },
          ...messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          })),
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
