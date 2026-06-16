import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit, _resetRateLimitState } from './rateLimiter.js'

test('allows requests under the limit', () => {
  _resetRateLimitState()
  const now = 1000
  for (let i = 0; i < 5; i++) {
    assert.equal(checkRateLimit('1.2.3.4', now), true)
  }
})

test('blocks the 6th request within the window', () => {
  _resetRateLimitState()
  const now = 1000
  for (let i = 0; i < 5; i++) {
    checkRateLimit('1.2.3.4', now)
  }
  assert.equal(checkRateLimit('1.2.3.4', now), false)
})

test('different IPs have independent limits', () => {
  _resetRateLimitState()
  const now = 1000
  for (let i = 0; i < 5; i++) {
    checkRateLimit('1.2.3.4', now)
  }
  assert.equal(checkRateLimit('5.6.7.8', now), true)
})

test('allows requests again after the window passes', () => {
  _resetRateLimitState()
  const now = 1000
  for (let i = 0; i < 5; i++) {
    checkRateLimit('1.2.3.4', now)
  }
  assert.equal(checkRateLimit('1.2.3.4', now + 60_001), true)
})
