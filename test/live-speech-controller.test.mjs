import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

import { DEFAULT_TTS_SEGMENT_CHARACTERS, prepareTtsText, TtsFirstSegmentLimiter } from '../lib/shared.js'

async function clientModuleUrl(path, replacements = {}) {
  let code = ts.transpile(await readFile(new URL(path, import.meta.url), 'utf8'), { module: ts.ModuleKind.ESNext })
  for (const [specifier, url] of Object.entries(replacements)) code = code.replace(specifier, url)
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}

const sharedUrl = new URL('../lib/shared.js', import.meta.url).href
const audioUrl = await clientModuleUrl('../src/client/playback/pcm-audio-queue.ts', {
  '../../debug-console.js': new URL('../src/debug-console.ts', import.meta.url).href,
  '../../shared.js': sharedUrl,
  './voice-rate.js': await clientModuleUrl('../src/client/playback/voice-rate.ts'),
})
const { LiveSpeechController } = await import(await clientModuleUrl('../src/client/playback/live-speech-controller.ts', {
  '@deepseek-ai/dsh-client-ui-primitives': new URL('./fixtures/plain-text.ts', import.meta.url).href,
  '../../shared.js': sharedUrl,
  '../../pcm-stream.js': new URL('../lib/pcm-stream.js', import.meta.url).href,
  './pcm-audio-queue.js': audioUrl,
  '../history/pcm-recording.js': new URL('../src/client/history/pcm-recording.ts', import.meta.url).href,
}))

const settle = () => new Promise((resolve) => setImmediate(resolve))

// Exercise the real request and playback queues with browser audio and HTTP boundaries replaced.
async function withPlayback(run) {
  const originalFetch = globalThis.fetch
  const originalAudioContext = globalThis.AudioContext
  const requests = []
  globalThis.fetch = async (url, init) => {
    requests.push({ ...JSON.parse(init.body), signal: init.signal })
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { audio: { data: 'AAA=' } } }] })}\n\n`)
  }
  globalThis.AudioContext = class {
    state = 'running'
    currentTime = 0
    destination = {}
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} } }
    createBuffer(channels, length, sampleRate) {
      return { duration: length / sampleRate, getChannelData: () => new Float32Array(length) }
    }
    createBufferSource() {
      const source = new EventTarget()
      source.playbackRate = { value: 1 }
      source.connect = () => {}
      source.start = () => { queueMicrotask(() => source.dispatchEvent(new Event('ended'))) }
      source.stop = () => { source.dispatchEvent(new Event('ended')) }
      return source
    }
    async close() { this.state = 'closed' }
  }
  const live = new LiveSpeechController()
  live.activateSession('session')
  try {
    await run(live, requests)
  } finally {
    await live.dispose()
    globalThis.fetch = originalFetch
    if (originalAudioContext === undefined) delete globalThis.AudioContext
    else globalThis.AudioContext = originalAudioContext
  }
}

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
