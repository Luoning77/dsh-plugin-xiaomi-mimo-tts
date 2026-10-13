import assert from 'node:assert/strict'
import test from 'node:test'
import { loadClientModule, settle } from './helpers/client-modules.mjs'
import { pcmEvent, withBrowserPlayback } from './helpers/browser-playback.mjs'

import { countTtsSpeechCharacters, DEFAULT_TTS_SEGMENT_CHARACTERS, MAX_TTS_SEGMENT_CHARACTERS, prepareTtsText, splitTtsSegments, TtsFirstSegmentLimiter } from '../lib/shared.js'

const { LiveSpeechController } = await loadClientModule('src/client/playback/live-speech-controller.ts')

async function withPlayback(run, options = {}, history) {
  await withBrowserPlayback(async state => {
    const live = new LiveSpeechController(history)
    live.activateSession('session')
    try { await run(live, state.requests) } finally { await live.dispose() }
  }, { endPcm: true, ...options })
}

test('short sentences accumulate into semantic PCM slices and one recording per slice', async () => {
  const saved = []
  await withPlayback(async (live, requests) => {
    const sentence = '甲'.repeat(30) + '。'
    let text = ''
    for (let index = 0; index < 12; index += 1) {
      text += sentence
      live.observe('session', 1, 0, text)
      await settle()
      if (countTtsSpeechCharacters(text) < DEFAULT_TTS_SEGMENT_CHARACTERS) assert.equal(requests.length, 0)
    }
    live.finish('session', { turn: 1, step: 0, messageId: 'message', text })
    await settle()
    const segments = splitTtsSegments(text)
    assert.equal(segments.length, 2)
    assert.deepEqual(requests.map(request => request.text), segments)
    assert.deepEqual(saved.map(entry => entry.text), segments)
    for (const entry of saved) {
      const bytes = new DataView(await entry.blob.arrayBuffer())
      assert.equal(entry.format, 'wav')
      assert.equal(bytes.getUint32(40, true), 4)
    }
  }, { fetch: () => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(pcmEvent())
    controller.enqueue(pcmEvent())
    controller.close()
  } })) }, { add: entry => { saved.push(entry) } })
})

test('a short live reply flushes once when generation finishes', async () => {
  await withPlayback(async (live, requests) => {
    const text = '这是一段很短的回复。后面还有一句话。'
    live.observe('session', 1, 0, text)
    await settle()
    assert.equal(requests.length, 0)
    live.finish('session', { turn: 1, step: 0, messageId: 'message', text })
    await settle()
    assert.deepEqual(requests.map(request => request.text), [prepareTtsText(text)])
  })
})

test('pending sentences count toward the unfinished PCM slice without repeating text', async () => {
  await withPlayback(async (live, requests) => {
    const first = '甲'.repeat(40) + '。'
    const prefix = '乙'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS - 40)
    live.observe('session', 1, 0, first)
    await settle()
    assert.equal(requests.length, 0)
    live.observe('session', 1, 0, first + prefix)
    await settle()
    assert.deepEqual(requests.map(request => request.text), [prepareTtsText(first + prefix)])
    const text = first + prefix + '这是后续正文。'
    live.observe('session', 1, 0, text)
    live.finish('session', { turn: 1, step: 0, messageId: 'message', text })
    await settle()
    assert.equal(requests.map(request => request.text).join(''), prepareTtsText(text))
  })
})

test('PCM sentence grouping respects the preferred maximum and keeps long sentences whole', async () => {
  await withPlayback(async (live, requests) => {
    const text = ['甲'.repeat(100), '乙'.repeat(200), '丙'.repeat(MAX_TTS_SEGMENT_CHARACTERS + 60)].map(sentence => sentence + '。').join('')
    live.observe('session', 1, 0, text)
    live.finish('session', { turn: 1, step: 0, messageId: 'message', text })
    await settle()
    assert.deepEqual(requests.map(request => request.text), splitTtsSegments(text))
  })
})

test('completed PCM replies use semantic slices too', async () => {
  await withPlayback(async (live, requests) => {
    const text = ('甲'.repeat(30) + '。').repeat(12)
    live.playCompleted('session', 'message', text, () => assert.fail('unexpected fallback'))
    await settle()
    assert.deepEqual(requests.map(request => request.text), splitTtsSegments(text))
  })
})

test('cancelling a completed PCM reply discards queued slices and late recordings', async () => {
  let respond
  const saved = []
  await withPlayback(async (live, requests) => {
    const text = ('甲'.repeat(30) + '。').repeat(12)
    live.playCompleted('session', 'message', text, () => assert.fail('unexpected fallback'))
    const signal = requests[0].signal
    live.cancel()
    respond(new Response(pcmEvent()))
    await settle()
    assert.equal(signal.aborted, true)
    assert.equal(requests.length, 1)
    assert.equal(saved.length, 0)
  }, { fetch: () => new Promise(resolve => { respond = resolve }) }, { add: entry => { saved.push(entry) } })
})

test('failure before the first completed PCM slice falls back once and skips remaining slices', async () => {
  await withPlayback(async (live, requests) => {
    let fallbacks = 0
    const text = ('甲'.repeat(30) + '。').repeat(12)
    live.playCompleted('session', 'message', text, () => { fallbacks += 1 })
    await settle()
    assert.equal(fallbacks, 1)
    assert.equal(requests.length, 1)
  }, { fetch: () => new Response('failed', { status: 503 }) })
})

test('provisional PCM requests keep decimals and words intact across partial updates', async () => {
  for (const token of ['3.14', 'temperature']) {
    await withPlayback(async (live, requests) => {
      const prefix = '甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS - 1)
      live.observe('session', 1, 0, prefix + token.slice(0, 1))
      await settle()
      assert.equal(requests.length, 0)
      live.observe('session', 1, 0, prefix + token.slice(0, 2))
      await settle()
      assert.equal(requests.length, 0)

      const text = prefix + token + '度是目前的温度'
      live.observe('session', 1, 0, text)
      await settle()
      assert.ok(requests.some((request) => request.text.includes(token)))
      live.finish('session', { turn: 1, step: 0, messageId: 'message', text })
      await settle()
      assert.equal(requests.map((request) => request.text).join(''), prepareTtsText(text))
    })
  }
})

test('two-segment live playback neither repeats the opening nor speaks a third segment', async () => {
  await withPlayback(async (live, requests) => {
    const limiter = new TtsFirstSegmentLimiter(2)
    const first = '甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS) + '。'
    const short = '乙'.repeat(40) + '。'
    const long = '丙'.repeat(300) + '。'
    for (const text of [first, first + short, first + short + long.slice(0, 160), first + short + long]) {
      live.observe('session', 1, 0, limiter.limit(text))
      await settle()
    }
    live.finish('session', { turn: 1, step: 0, messageId: 'message', text: limiter.limit(first + short + long, true) })
    await settle()
    const spoken = requests.map((request) => request.text).join('').replace(/[^\p{L}\p{N}]/gu, '')
    assert.equal(spoken, '甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS) + '乙'.repeat(40))
  })
})
