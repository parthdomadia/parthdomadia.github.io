// joke-proxy/api/joke.js
import { checkRateLimit } from '../lib/rateLimiter.js'
import { buildPrompt } from '../lib/buildPrompt.js'

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://parthdomadia.github.io'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Too many requests' })
    return
  }

  const { name, description } = req.body || {}

  let prompt
  try {
    prompt = buildPrompt(name, description)
  } catch {
    res.status(400).json({ error: 'Invalid request' })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server misconfigured' })
    return
  }

  try {
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 60,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      }),
    })

    if (!anthropicRes.ok) {
      res.status(502).json({ error: 'Upstream error' })
      return
    }

    const data = await anthropicRes.json()
    const joke = data?.content?.[0]?.text?.trim()

    if (!joke) {
      res.status(502).json({ error: 'Empty response' })
      return
    }

    res.status(200).json({ joke })
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
}
