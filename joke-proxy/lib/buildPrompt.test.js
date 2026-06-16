import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPrompt } from './buildPrompt.js'

test('builds a prompt from name and description', () => {
  const prompt = buildPrompt('Canvas', 'A drag-and-drop diagramming tool.')
  assert.match(prompt.system, /one sentence/i)
  assert.match(prompt.user, /Canvas/)
  assert.match(prompt.user, /drag-and-drop diagramming tool/)
})

test('trims whitespace', () => {
  const prompt = buildPrompt('  Canvas  ', '  does things  ')
  assert.match(prompt.user, /Project name: Canvas\n/)
})

test('truncates an overly long name', () => {
  const longName = 'x'.repeat(200)
  const prompt = buildPrompt(longName, 'desc')
  const nameLine = prompt.user.split('\n')[0]
  assert.ok(nameLine.length <= 'Project name: '.length + 80)
})

test('truncates an overly long description', () => {
  const longDesc = 'y'.repeat(2000)
  const prompt = buildPrompt('Canvas', longDesc)
  assert.ok(prompt.user.length < 1000)
})

test('throws on non-string input', () => {
  assert.throws(() => buildPrompt(123, 'desc'))
  assert.throws(() => buildPrompt('name', null))
})

test('throws on empty input after trimming', () => {
  assert.throws(() => buildPrompt('   ', 'desc'))
  assert.throws(() => buildPrompt('name', '   '))
})
