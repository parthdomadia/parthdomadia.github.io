const WINDOW_MS = 60_000
const MAX_REQUESTS = 5

let hits = new Map() // ip -> array of timestamps (ms)

function storeTimestamps(ip, timestamps) {
  // drop the IP entirely once its window is empty, so memory doesn't grow unbounded for one-off callers
  if (timestamps.length === 0) {
    hits.delete(ip)
  } else {
    hits.set(ip, timestamps)
  }
}

export function checkRateLimit(ip, now = Date.now()) {
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)

  if (timestamps.length >= MAX_REQUESTS) {
    storeTimestamps(ip, timestamps)
    return false
  }

  timestamps.push(now)
  storeTimestamps(ip, timestamps)
  return true
}

export function _resetRateLimitState() {
  hits = new Map()
}
