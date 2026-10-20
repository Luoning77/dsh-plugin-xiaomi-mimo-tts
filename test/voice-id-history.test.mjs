import assert from 'node:assert/strict'
import test from 'node:test'
import { loadClientModule } from './helpers/client-modules.mjs'

const { readVoiceIdHistory, rememberVoiceId, writeVoiceIdHistory } = await loadClientModule('src/client/settings/voice-id-history.ts')

test('voice ID history retains the ten most recent unique nonempty IDs', () => {
  let history = []
  for (let index = 0; index < 12; index++) history = rememberVoiceId(history, `voice-${index}`)
  assert.deepEqual(history, Array.from({ length: 10 }, (_, index) => `voice-${11 - index}`))
  history = rememberVoiceId(history, ' voice-5 ')
  assert.equal(history[0], 'voice-5')
  assert.equal(history.length, 10)
  assert.equal(history.filter(value => value === 'voice-5').length, 1)
  assert.deepEqual(rememberVoiceId(history, '  '), history)
})

for (const kind of ['standard', 'cloned']) test(`${kind} voice history persists and tolerates unavailable or malformed storage`, () => {
  let stored
  const storage = { getItem: () => stored ?? null, setItem: (_key, value) => { stored = value } }
  writeVoiceIdHistory(kind, ['second', 'first'], storage)
  assert.deepEqual(readVoiceIdHistory(kind, storage), ['second', 'first'])
  stored = '[null, " first ", "first", 3, "", "second"]'
  assert.deepEqual(readVoiceIdHistory(kind, storage), ['first', 'second'])
  for (const value of ['{', '{}', 'null']) {
    stored = value
    assert.deepEqual(readVoiceIdHistory(kind, storage), [])
  }
  const unavailable = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('full') } }
  assert.deepEqual(readVoiceIdHistory(kind, unavailable), [])
  assert.doesNotThrow(() => writeVoiceIdHistory(kind, ['first'], unavailable))
})

test('standard and cloned histories stay separate and existing cloned IDs are preserved', () => {
  const stored = new Map([['dsh-xiaomi-mimo-tts:cloned-voice-history', '["saved-clone"]']])
  const storage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) }
  assert.deepEqual(readVoiceIdHistory('cloned', storage), ['saved-clone'])
  assert.deepEqual(readVoiceIdHistory('standard', storage), [])
  writeVoiceIdHistory('standard', ['standard-one', 'standard-two'], storage)
  assert.deepEqual(readVoiceIdHistory('cloned', storage), ['saved-clone'])
  writeVoiceIdHistory('cloned', ['new-clone', 'saved-clone'], storage)
  assert.deepEqual(readVoiceIdHistory('standard', storage), ['standard-one', 'standard-two'])
  assert.deepEqual(readVoiceIdHistory('cloned', storage), ['new-clone', 'saved-clone'])
})
