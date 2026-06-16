const WINDOW_MS = 60_000
const MAX_REQUESTS = 5

let hits = new Map() // ip -> array of timestamps (ms)

export function checkRateLimit(ip, now = Date.now()) {
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)

  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(ip, timestamps)
    return false
  }

  timestamps.push(now)
  hits.set(ip, timestamps)
  return true
}

export function _resetRateLimitState() {
  hits = new Map()
}
