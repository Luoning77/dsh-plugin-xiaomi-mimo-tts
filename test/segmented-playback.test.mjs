import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveTtsSettings, splitTtsSegments } from '../lib/shared.js'
import { loadClientModule, settle } from './helpers/client-modules.mjs'
import { withBrowserPlayback } from './helpers/browser-playback.mjs'

const { PlaybackController } = await loadClientModule('src/client/playback/playback-controller.ts')
const { LiveSpeechController } = await loadClientModule('src/client/playback/live-speech-controller.ts')
const { LocalSpeechController } = await loadClientModule('src/client/playback/local-speech-controller.ts')
const { handleReadAloudClick } = await loadClientModule('src/client/playback/read-aloud-playback.ts')
const text = '甲'.repeat(200) + '。' + '乙'.repeat(200) + '。'
const segments = splitTtsSegments(text)

async function withSegmented(run, options = {}) {
  await withBrowserPlayback(async state => {
    const playback = new PlaybackController()
    const live = new LiveSpeechController()
    const local = new LocalSpeechController()
    playback.activateSession('session')
    live.activateSession('session')
    local.activateSession('session')
    const request = {
      sessionId: 'session', messageId: 'message', text, turn: 1, playback, live, local, apiKeySupported: true,
      settings: resolveTtsSettings({ model: 'mimo-v2.5-tts-voicedesign', localSpeechMode: 'disabled' }),
    }
    try { await run({ ...state, playback, request }) } finally {
      playback.dispose()
      await live.dispose()
      local.dispose()
    }
  }, { fetch: () => new Response('wav bytes'), ...options })
}

test('the segmented retry action starts synthesis again after the first segment fails', async () => {
  let failing = true
  await withSegmented(async state => {
    await state.playback.segmented('session', 'message', text, false)
    assert.equal(state.playback.getSnapshot().status, 'error')
    failing = false
    handleReadAloudClick(state.request, state.playback.getSnapshot())
    await settle()
    assert.equal(state.playback.getSnapshot().status, 'playing')
    state.media[0].dispatchEvent(new Event('ended'))
    await settle()
    state.media[1].dispatchEvent(new Event('ended'))
    await settle()
    assert.equal(state.playback.getSnapshot().status, 'idle')
    assert.deepEqual(state.requests.slice(2).map(value => value.text), segments)
    assert.ok(state.requests.every(value => value.format === 'wav'))
    assert.ok(state.media.every(audio => audio.listeners.size === 0))
    assert.deepEqual([...state.revoked].sort(), [...state.created].sort())
  }, { fetch: () => failing ? new Response('failed', { status: 503 }) : new Response('wav bytes') })
})

test('prefetch failure is handled while audio plays and retry starts at the failed next segment', async () => {
  let failing = true
  await withSegmented(async state => {
    const task = state.playback.segmented('session', 'message', text, false)
    await settle()
    assert.equal(state.media.length, 1)
    assert.equal(state.playback.getSnapshot().status, 'playing')
    state.media[0].dispatchEvent(new Event('ended'))
    await task
    assert.equal(state.playback.getSnapshot().status, 'error')
    const previousRequests = state.requests.length
    failing = false
    handleReadAloudClick(state.request, state.playback.getSnapshot())
    await settle()
    assert.deepEqual(state.requests.slice(previousRequests).map(value => value.text), [segments[1]])
    state.media[1].dispatchEvent(new Event('ended'))
    await settle()
    assert.equal(state.playback.getSnapshot().status, 'idle')
  }, { fetch: request => failing && request.text === segments[1] ? new Response('failed', { status: 503 }) : new Response('wav bytes') })
})

test('cancelling a playing segment settles its task and releases every media resource', async () => {
  await withSegmented(async state => {
    const task = state.playback.segmented('session', 'message', text, false)
    await settle()
    state.playback.cancelPlayback('session')
    await task
    assert.equal(state.playback.getSnapshot().status, 'idle')
    assert.ok(state.requests.every(value => value.signal.aborted))
    assert.ok(state.media.every(audio => audio.paused && audio.src === '' && audio.listeners.size === 0))
    assert.deepEqual(state.revoked, state.created)
  })
})

test('pausing and resuming a segment discards the old operation without publishing late state', async () => {
  await withSegmented(async state => {
    const oldTask = state.playback.segmented('session', 'message', text, false)
    await settle()
    handleReadAloudClick(state.request, state.playback.getSnapshot())
    await oldTask
    assert.equal(state.playback.getSnapshot().status, 'paused')
    handleReadAloudClick(state.request, state.playback.getSnapshot())
    await settle()
    state.media[0].dispatchEvent(new Event('ended'))
    assert.equal(state.playback.getSnapshot().status, 'playing')
    state.media[1].dispatchEvent(new Event('ended'))
    await settle()
    state.media[2].dispatchEvent(new Event('ended'))
    await settle()
    assert.equal(state.playback.getSnapshot().status, 'idle')
    assert.ok(state.media.every(audio => audio.listeners.size === 0))
  })
})

test('a late synthesis response after cancellation neither creates media nor retries an aborted request', async () => {
  let respond
  await withSegmented(async state => {
    const task = state.playback.segmented('session', 'message', text, false)
    state.playback.cancelPlayback('session')
    respond(new Response('failed', { status: 503 }))
    await task
    assert.equal(state.requests.length, 1)
    assert.equal(state.media.length, 0)
    assert.equal(state.playback.getSnapshot().status, 'idle')
  }, { fetch: () => new Promise(resolve => { respond = resolve }) })
})
