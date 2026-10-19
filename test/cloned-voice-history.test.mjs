import assert from 'node:assert/strict'
import test from 'node:test'
import { loadClientModule } from './helpers/client-modules.mjs'

const { readClonedVoiceHistory, rememberClonedVoice, writeClonedVoiceHistory } = await loadClientModule('src/client/settings/cloned-voice-history.ts')

test('cloned voice history retains the ten most recent unique nonempty IDs', () => {
  let history = []
  for (let index = 0; index < 12; index++) history = rememberClonedVoice(history, `voice-${index}`)
  assert.deepEqual(history, Array.from({ length: 10 }, (_, index) => `voice-${11 - index}`))
  history = rememberClonedVoice(history, ' voice-5 ')
  assert.equal(history[0], 'voice-5')
  assert.equal(history.length, 10)
  assert.equal(history.filter(value => value === 'voice-5').length, 1)
  assert.deepEqual(rememberClonedVoice(history, '  '), history)
})

test('cloned voice history persists and tolerates unavailable or malformed storage', () => {
  let stored
  const storage = { getItem: () => stored ?? null, setItem: (_key, value) => { stored = value } }
  writeClonedVoiceHistory(['second', 'first'], storage)
  assert.deepEqual(readClonedVoiceHistory(storage), ['second', 'first'])
  stored = '[null, " first ", "first", 3, "", "second"]'
  assert.deepEqual(readClonedVoiceHistory(storage), ['first', 'second'])
  for (const value of ['{', '{}', 'null']) {
    stored = value
    assert.deepEqual(readClonedVoiceHistory(storage), [])
  }
  const unavailable = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('full') } }
  assert.deepEqual(readClonedVoiceHistory(unavailable), [])
  assert.doesNotThrow(() => writeClonedVoiceHistory(['first'], unavailable))
})
