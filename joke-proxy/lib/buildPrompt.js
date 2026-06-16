const MAX_NAME_LEN = 80
const MAX_DESC_LEN = 600

const SYSTEM_PROMPT =
  'You write one-line, funny, self-deprecating jokes that describe a ' +
  'software project in a quirky way. Respond with exactly one sentence, ' +
  'no more than 20 words, no quotes, no preamble, no markdown.'

export function buildPrompt(name, description) {
  if (typeof name !== 'string' || typeof description !== 'string') {
    throw new Error('name and description must be strings')
  }

  const safeName = name.slice(0, MAX_NAME_LEN).trim()
  const safeDescription = description.slice(0, MAX_DESC_LEN).trim()

  if (!safeName || !safeDescription) {
    throw new Error('name and description must not be empty')
  }

  return {
    system: SYSTEM_PROMPT,
    user: `Project name: ${safeName}\nReal description: ${safeDescription}\n\nWrite the joke description now.`,
  }
}
