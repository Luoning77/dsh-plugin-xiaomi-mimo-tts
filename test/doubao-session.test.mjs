import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { resolveTtsSettings, ttsSelection, isSupportedTtsApiKey } from '../lib/shared.js'
import { loadClientModule } from './helpers/client-modules.mjs'
import { withDoubaoServer, serverFrame } from './helpers/doubao-server.mjs'

const { DoubaoSession, synthesizeDoubao, wrapPcmWav } = await loadClientModule('src/host/doubao.ts')
const { safeProviderError, TtsProviderError } = await loadClientModule('src/host/provider-error.ts')
const { synthesisOptions, validateSynthesisSettings } = await loadClientModule('src/host/validation.ts')
const settings = (extra = {}) => resolveTtsSettings({ provider: 'doubao', doubaoApiKey: 'test-key', requestTimeoutMs: 500, ...extra })

test('Doubao sends multiple text inputs in one session and delivers audio before FinishSession', async () => {
  await withDoubaoServer(async ({ connect, frames, headers }) => {
    const chunks = []
    let firstAudio
    const received = new Promise(resolve => { firstAudio = resolve })
    const session = new DoubaoSession({ settings: settings(), connect, signal: new AbortController().signal, onAudio: bytes => { chunks.push(bytes); firstAudio() } })
    await session.ready
    session.append('你好。')
    await received
    assert.equal(frames.some(frame => frame.event === 102), false)
    session.append('世界。')
    await session.finish()
    assert.deepEqual(frames.map(frame => frame.event), [1, 100, 200, 200, 102, 2])
    assert.equal(new Set(frames.filter(frame => frame.event >= 100).map(frame => frame.sessionId)).size, 1)
    assert.deepEqual(frames.filter(frame => frame.event === 200).map(frame => frame.payload.req_params.text), ['你好。', '世界。'])
    assert.equal(chunks.length, 2)
    assert.equal(headers[0]['x-api-key'], 'test-key')
    assert.equal(headers[0]['x-api-resource-id'], 'seed-tts-2.0')
    const start = frames.find(frame => frame.event === 100).payload.req_params
    assert.equal(start.speaker, 'zh_female_vv_uranus_bigtts')
    assert.equal(start.model, undefined)
    assert.deepEqual(start.audio_params, { format: 'pcm', sample_rate: 24000, speech_rate: 0 })
    assert.throws(() => session.append('too late'), /not accepting/)
  })
})

test('cloned voice uses its own resource and explicit inference model without context_texts', async () => {
  await withDoubaoServer(async ({ connect, frames, headers }) => {
    const chunks = []
    await synthesizeDoubao('复刻测试', { settings: settings({ doubaoModel: 'seed-icl-2.0', doubaoClonedVoice: 'my-clone', doubaoInstruction: 'do not send to cloned voice' }), connect, signal: new AbortController().signal, onAudio: bytes => chunks.push(bytes) })
    const start = frames.find(frame => frame.event === 100).payload.req_params
    assert.equal(headers[0]['x-api-resource-id'], 'seed-icl-2.0')
    assert.equal(start.speaker, 'my-clone')
    assert.equal(start.model, 'seed-tts-2.0-standard')
    assert.equal(start.additions, undefined)
    const wav = wrapPcmWav(Buffer.concat(chunks))
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF')
    assert.equal(wav.readUInt32LE(24), 24000)
    assert.equal(wav.readUInt32LE(40), 4)
    assert.throws(() => wrapPcmWav(Buffer.from([1])), /invalid-audio-format/)
  })
})

test('standard voice instructions are serialized once at session start and fixed for appended text', async () => {
  await withDoubaoServer(async ({ connect, frames }) => {
    const configured = settings({ doubaoInstruction: '  温柔地说话，保留 "停顿"。\n不要改变原文。  ' })
    const session = new DoubaoSession({ settings: configured, connect, signal: new AbortController().signal, onAudio() {} })
    configured.doubaoInstruction = 'changed after the session started'
    await session.ready
    session.append('第一句。')
    session.append('第二句。')
    await session.finish()
    const starts = frames.filter(frame => frame.event === 100)
    assert.equal(starts.length, 1)
    const params = starts[0].payload.req_params
    assert.equal(typeof params.additions, 'string')
    assert.deepEqual(JSON.parse(params.additions), { context_texts: ['温柔地说话，保留 "停顿"。\n不要改变原文。'] })
    assert.equal(params.model, undefined)
    assert.deepEqual(frames.filter(frame => frame.event === 200).map(frame => frame.payload.req_params), [{ text: '第一句。' }, { text: '第二句。' }])
  })
})

test('empty standard voice instructions omit upstream additions', async () => {
  await withDoubaoServer(async ({ connect, frames }) => {
    await synthesizeDoubao('默认表达', { settings: settings({ doubaoInstruction: ' \n ' }), connect, signal: new AbortController().signal, onAudio() {} })
    assert.equal(frames.find(frame => frame.event === 100).payload.req_params.additions, undefined)
  })
})

test('instruction overrides support saved defaults, clearing and type validation', () => {
  const configured = settings({ doubaoInstruction: 'saved instruction', instruction: 'Xiaomi instruction' })
  assert.equal(ttsSelection(synthesisOptions(configured, {})).speechInstruction, 'saved instruction')
  assert.equal(ttsSelection(synthesisOptions(configured, { speechInstruction: '  preview instruction  ' })).speechInstruction, 'preview instruction')
  assert.equal(ttsSelection(synthesisOptions(configured, { speechInstruction: '' })).speechInstruction, '')
  for (const invalid of [null, 4, [], {}, true]) assert.throws(() => synthesisOptions(configured, { speechInstruction: invalid }), error => error.code === 'invalid-speech-instruction')
  assert.equal(configured.doubaoInstruction, 'saved instruction')
  assert.equal(ttsSelection(synthesisOptions(configured, { model: 'seed-icl-2.0', voice: 'clone', speechInstruction: 'ignored' })).speechInstruction, undefined)
  const xiaomi = synthesisOptions(configured, { provider: 'xiaomi', speechInstruction: 'Xiaomi draft' })
  assert.equal(ttsSelection(xiaomi).speechInstruction, 'Xiaomi draft')
  assert.equal(configured.instruction, 'Xiaomi instruction')
})

test('text limits cancel the upstream and already-aborted sessions settle without hanging', async () => {
  await withDoubaoServer(async ({ connect }) => {
    const controller = new AbortController()
    const session = new DoubaoSession({ settings: settings({ maxTextLength: 3 }), connect, signal: controller.signal, onAudio() {} })
    await session.ready
    session.append('你好')
    assert.throws(() => session.append('世界'), error => error.code === 'text-too-long')
    await assert.rejects(session.done, error => error.code === 'text-too-long')
    const aborted = new AbortController()
    aborted.abort()
    const canceled = new DoubaoSession({ settings: settings(), connect, signal: aborted.signal, onAudio() {} })
    await assert.rejects(canceled.ready, error => error.code === 'tts-canceled')
  })
})

test('stop after ready releases the upstream even without a cancel acknowledgment', async () => {
  await withDoubaoServer(async ({ connect }) => {
    const controller = new AbortController()
    let socket
    const session = new DoubaoSession({ settings: settings(), connect: headers => { socket = connect(headers); return socket }, signal: controller.signal, onAudio() {} })
    await session.ready
    const closed = once(socket, 'close')
    controller.abort()
    await assert.rejects(session.done, error => error.code === 'tts-canceled')
    await closed
  }, (_ws, frame) => frame.event === 101)
})

for (const failure of ['close', 'session', 'mismatch', 'timeout', 'empty']) test(`Doubao rejects ${failure} without a false completion`, async () => {
  await withDoubaoServer(async ({ connect }) => {
    const session = new DoubaoSession({ settings: settings({ requestTimeoutMs: 500 }), connect, signal: new AbortController().signal, onAudio() {} })
    await session.ready
    session.append('你好')
    await assert.rejects(session.finish(), error => error.code === ({ close: 'doubao-connection-closed', session: 'voice-unavailable', mismatch: 'doubao-session-mismatch', timeout: 'tts-timeout', empty: 'stream-audio-empty' })[failure])
  }, (ws, frame) => {
    if (frame.event === 200) {
      if (failure === 'close') ws.close()
      if (failure === 'session') ws.send(serverFrame(153, { message: 'speaker not available', status_code: 45000001 }, frame.sessionId))
      if (failure === 'mismatch') ws.send(serverFrame(352, Buffer.from([0, 0]), 'wrong-session', 11))
      return true
    }
    return failure === 'timeout' && frame.event === 102
  })
})

test('provider selection preserves legacy defaults and isolates credentials and voice overrides', () => {
  assert.equal(resolveTtsSettings().provider, 'xiaomi')
  assert.equal(isSupportedTtsApiKey('arbitrary-doubao-key', 'doubao'), true)
  assert.equal(isSupportedTtsApiKey('arbitrary-doubao-key'), false)
  assert.equal(isSupportedTtsApiKey('bad\nkey', 'doubao'), false)
  const base = settings({ apiKey: 'sk-xiaomi', voice: '茉莉', doubaoVoice: 'custom-standard', doubaoClonedVoice: 'custom-clone' })
  assert.equal(ttsSelection(synthesisOptions(base, { provider: 'doubao', model: 'seed-icl-2.0' })).voice, 'custom-clone')
  const preview = synthesisOptions(base, { provider: 'doubao', model: 'seed-tts-2.0', voice: 'preview-voice' })
  assert.equal(preview.doubaoVoice, 'preview-voice')
  assert.equal(preview.voice, '茉莉')
  assert.equal(base.doubaoVoice, 'custom-standard')
  assert.throws(() => synthesisOptions(base, { provider: 'doubao', model: 'mimo-v2.5-tts' }), /Doubao model/)
  assert.throws(() => validateSynthesisSettings(settings({ doubaoModel: 'seed-icl-2.0' })), error => error.code === 'voice-required')
  assert.throws(() => validateSynthesisSettings(settings({ doubaoApiKey: '' })), error => error.code === 'api-key-not-configured')
})

test('provider diagnostics redact echoed credentials and do not expose generic exception text', () => {
  const detail = safeProviderError(new TtsProviderError('doubao-api-error', 'Bad key private-token; X-Api-Key: another-token', 502, '45000001', 'request-id'), ['private-token'])
  assert.equal(detail.message.includes('private-token'), false)
  assert.equal(detail.message.includes('another-token'), false)
  assert.equal(detail.upstreamCode, '45000001')
  assert.equal(safeProviderError(new Error('secret in native error')).message.includes('secret'), false)
})

test('upstream odd PCM frames are joined before forwarding, while a terminal odd byte fails', async () => {
  for (const oddEnd of [false, true]) await withDoubaoServer(async ({ connect }) => {
    const chunks = []
    const work = synthesizeDoubao('测试', { settings: settings(), connect, signal: new AbortController().signal, onAudio: bytes => chunks.push(...bytes) })
    if (oddEnd) await assert.rejects(work, error => error.code === 'invalid-pcm-sample')
    else { await work; assert.deepEqual(chunks, [1, 2, 3, 4]) }
  }, (socket, frame) => {
    if (frame.event !== 200) return false
    socket.send(serverFrame(352, Buffer.from([1, 2, 3]), frame.sessionId, 11))
    if (!oddEnd) socket.send(serverFrame(352, Buffer.from([4]), frame.sessionId, 11))
    return true
  })
})
