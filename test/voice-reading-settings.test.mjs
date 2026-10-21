import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DOUBAO_VOICE_PRESETS,
  TTS_VOICE_DESIGN_PRESETS,
  TTS_VOICE_PRESETS,
  resolveTtsSettings,
} from '../lib/shared.js'
import { loadClientModule } from './helpers/client-modules.mjs'

const {
  buildVoiceReadingVoiceSource,
  voiceChoiceWriteOps,
  autoPlayWriteOps,
  soundWriteOps,
} = await loadClientModule('src/client/settings/voice-reading-options.ts')

/** Index write operations by their dotted path so order is not incidental. */
function operationsByPath(ops) {
  const mapped = new Map()
  for (const op of ops) mapped.set(op.path.join('.'), op)
  return mapped
}

/** Assert an exact set of `set` writes, independent of operation order. */
function assertSetOperations(ops, expected) {
  for (const op of ops) assert.equal(op.op, 'set')
  const mapped = operationsByPath(ops)
  assert.equal(mapped.size, ops.length, 'duplicate write paths in one mutation')
  assert.deepEqual([...mapped.keys()].sort(), Object.keys(expected).sort())
  for (const [path, value] of Object.entries(expected)) assert.deepEqual(mapped.get(path).value, value)
}

function sortedValues(choices) {
  return choices.map(choice => choice.value).sort()
}

for (const mode of [
  {
    name: 'xiaomi built-in voices',
    settings: {},
    field: 'voice',
    hintKey: 'settings.voiceReadingHintXiaomi',
    presetValues: TTS_VOICE_PRESETS.map(preset => preset.value),
  },
  {
    name: 'xiaomi voice design',
    settings: { model: 'mimo-v2.5-tts-voicedesign' },
    field: 'voiceDesignPrompt',
    hintKey: 'settings.voiceReadingHintVoiceDesign',
    presetValues: TTS_VOICE_DESIGN_PRESETS.map(preset => preset.prompt),
  },
  {
    name: 'doubao standard voices',
    settings: { provider: 'doubao' },
    field: 'doubaoVoice',
    hintKey: 'settings.voiceReadingHintDoubaoStandard',
    presetValues: DOUBAO_VOICE_PRESETS.map(preset => preset.value),
  },
  {
    name: 'doubao cloned voices',
    settings: { provider: 'doubao', doubaoModel: 'seed-icl-2.0', doubaoClonedVoice: 'clone-current' },
    field: 'doubaoClonedVoice',
    hintKey: 'settings.voiceReadingHintDoubaoCloned',
    presetValues: ['clone-current'],
  },
]) test(`${mode.name} select the matching voice field and hint`, () => {
  const resolved = resolveTtsSettings(mode.settings)
  const source = buildVoiceReadingVoiceSource(resolved)
  assert.equal(source.field, mode.field)
  assert.equal(source.value, resolved[mode.field])
  assert.equal(source.hintKey, mode.hintKey)
  assert.deepEqual(sortedValues(source.choices), [...mode.presetValues].sort())
  for (const choice of source.choices) {
    assert.equal(typeof choice.value, 'string')
    assert.equal(typeof choice.label, 'string')
    assert.ok(choice.label.length > 0, 'choice labels must be non-empty')
    if ('detail' in choice) assert.equal(typeof choice.detail, 'string')
  }
})

test('doubao standard choices carry the preset name and scene', () => {
  const source = buildVoiceReadingVoiceSource(resolveTtsSettings({ provider: 'doubao' }))
  const vivi = source.choices.find(choice => choice.value === 'zh_female_vv_uranus_bigtts')
  const preset = DOUBAO_VOICE_PRESETS.find(voice => voice.value === 'zh_female_vv_uranus_bigtts')
  assert.ok(vivi)
  assert.equal(vivi.label, preset.name)
  assert.equal(vivi.detail, preset.scene)
})

test('cloned voice source keeps the current id first, dedupes and drops blanks', () => {
  const resolved = resolveTtsSettings({
    provider: 'doubao',
    doubaoModel: 'seed-icl-2.0',
    doubaoClonedVoice: 'clone-a',
  })
  const source = buildVoiceReadingVoiceSource(resolved, ['clone-b', 'clone-a', ' ', 'clone-b', '', 'clone-c'])
  assert.equal(source.field, 'doubaoClonedVoice')
  assert.equal(source.value, 'clone-a')
  assert.deepEqual(source.choices.map(choice => choice.value), ['clone-a', 'clone-b', 'clone-c'])
})

test('cloned voice source tolerates missing history and a blank current id', () => {
  const current = resolveTtsSettings({ provider: 'doubao', doubaoModel: 'seed-icl-2.0', doubaoClonedVoice: 'only-current' })
  const source = buildVoiceReadingVoiceSource(current, undefined)
  assert.equal(source.value, 'only-current')
  assert.deepEqual(source.choices.map(choice => choice.value), ['only-current'])

  const blank = buildVoiceReadingVoiceSource(
    resolveTtsSettings({ provider: 'doubao', doubaoModel: 'seed-icl-2.0', doubaoClonedVoice: '' }),
    ['', ' ', 'from-history'],
  )
  assert.equal(blank.value, '')
  assert.deepEqual(blank.choices.map(choice => choice.value), ['from-history'])
})

for (const mode of [
  {
    name: 'xiaomi',
    settings: {},
    field: 'voice',
    selected: TTS_VOICE_PRESETS[1].value,
    expectedPaths: ['voice'],
  },
  {
    name: 'voice design',
    settings: { model: 'mimo-v2.5-tts-voicedesign' },
    field: 'voiceDesignPrompt',
    selected: TTS_VOICE_DESIGN_PRESETS[1].prompt,
    expectedPaths: ['voiceDesignPrompt', 'voiceDesignCustomPrompt'],
  },
  {
    name: 'doubao standard',
    settings: { provider: 'doubao' },
    field: 'doubaoVoice',
    selected: DOUBAO_VOICE_PRESETS[1].value,
    expectedPaths: ['doubaoVoice'],
  },
  {
    name: 'doubao cloned',
    settings: { provider: 'doubao', doubaoModel: 'seed-icl-2.0' },
    field: 'doubaoClonedVoice',
    selected: 'new-clone-id',
    expectedPaths: ['doubaoClonedVoice'],
  },
]) test(`${mode.name} voice selection writes ${mode.expectedPaths.join(' + ')} with no duplicates`, () => {
  const source = buildVoiceReadingVoiceSource(resolveTtsSettings(mode.settings))
  assert.equal(source.field, mode.field)
  const ops = voiceChoiceWriteOps(source, mode.selected)
  for (const op of ops) {
    assert.equal(op.op, 'set')
    assert.equal(op.value, mode.selected)
  }
  const paths = ops.map(op => op.path.join('.'))
  assert.equal(new Set(paths).size, paths.length, 'duplicate write paths')
  assert.deepEqual(paths.sort(), [...mode.expectedPaths].sort())
})

test('turning automatic playback off writes only autoPlay false', () => {
  assert.deepEqual(autoPlayWriteOps(false, resolveTtsSettings({})), [
    { op: 'set', path: ['autoPlay'], value: false },
  ])
})

test('turning automatic playback on keeps an already enabled voice reading setting', () => {
  const ops = autoPlayWriteOps(true, resolveTtsSettings({ enabled: true }))
  assert.deepEqual(ops, [{ op: 'set', path: ['autoPlay'], value: true }])
})

test('turning automatic playback on also enables a disabled voice reading setting', () => {
  const ops = autoPlayWriteOps(true, resolveTtsSettings({ enabled: false }))
  assertSetOperations(ops, { autoPlay: true, enabled: true })
})

test('turning sound effects off writes only soundEnabled false', () => {
  const current = resolveTtsSettings({ soundEnabled: true, taskSounds: true, clickSounds: true })
  assert.deepEqual(soundWriteOps(false, current), [
    { op: 'set', path: ['soundEnabled'], value: false },
  ])
})

test('turning sound effects on from fully disabled enables both sound scopes', () => {
  const ops = soundWriteOps(true, resolveTtsSettings({}))
  assertSetOperations(ops, { soundEnabled: true, taskSounds: true, clickSounds: true })
})

test('turning sound effects on preserves an existing narrow or full scope', () => {
  for (const current of [
    { soundEnabled: false, taskSounds: false, clickSounds: true },
    { soundEnabled: false, taskSounds: true, clickSounds: false },
    { soundEnabled: false, taskSounds: true, clickSounds: true },
  ]) {
    assertSetOperations(soundWriteOps(true, resolveTtsSettings(current)), { soundEnabled: true })
  }
})

test('resolved settings always yield a voice change that satisfies the write contract', () => {
  const inputs = [
    {},
    { provider: 'doubao' },
    { provider: 'doubao', doubaoModel: 'seed-icl-2.0' },
    { model: 'mimo-v2.5-tts-voicedesign' },
  ]
  for (const input of inputs) {
    const resolved = resolveTtsSettings(input)
    const source = buildVoiceReadingVoiceSource(resolved)
    assert.ok(Array.isArray(source.choices))
    assert.equal(source.value, resolved[source.field], `source value must mirror ${source.field}`)
    const ops = voiceChoiceWriteOps(source, source.value)
    assert.ok(ops.length > 0)
    for (const op of ops) {
      assert.equal(op.op, 'set')
      assert.ok(Array.isArray(op.path) && op.path.length > 0, 'write path must be non-empty')
    }
    const paths = ops.map(op => op.path.join('.'))
    assert.equal(new Set(paths).size, paths.length, 'duplicate write paths')
  }
})
