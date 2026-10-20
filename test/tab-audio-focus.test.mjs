import assert from 'node:assert/strict'
import test from 'node:test'
import { loadClientModule } from './helpers/client-modules.mjs'

const { TabAudioFocus } = await loadClientModule('src/client/playback/tab-audio-focus.ts')
const { PlaybackController } = await loadClientModule('src/client/playback/playback-controller.ts')

function browser() {
  const values = new Map()
  const tabs = []
  const events = []
  const emit = (target, key, newValue, storageArea) => {
    const event = new Event('storage')
    Object.assign(event, { key, newValue, storageArea })
    events.push(() => target.dispatchEvent(event))
  }
  const flush = () => { while (events.length) events.shift()() }
  const open = ({ focused = false, blocked = false } = {}) => {
    const target = new EventTarget()
    const document = new EventTarget()
    document.visibilityState = focused ? 'visible' : 'hidden'
    document.hasFocus = () => focused
    target.document = document
    const storage = {
      getItem: key => { if (blocked) throw new Error('blocked'); return values.get(key) ?? null },
      setItem(key, value) {
        if (blocked) throw new Error('blocked')
        if (values.get(key) === value) return
        values.set(key, value)
        for (const tab of tabs) if (tab.target !== target) emit(tab.target, key, value, tab.target.localStorage)
      },
      removeItem(key) {
        if (!values.delete(key)) return
        for (const tab of tabs) if (tab.target !== target) emit(tab.target, key, null, tab.target.localStorage)
      },
    }
    target.localStorage = storage
    const focus = new TabAudioFocus(target)
    const deactivate = focus.activate()
    const tab = {
      target, focus, deactivate,
      setFocus(next) {
        focused = next
        document.visibilityState = next ? 'visible' : 'hidden'
        target.dispatchEvent(new Event(next ? 'focus' : 'blur'))
        document.dispatchEvent(new Event('visibilitychange'))
      },
    }
    tabs.push(tab)
    return tab
  }
  return { open, flush, close: () => { for (const tab of tabs) tab.deactivate() } }
}

test('only the last focused DSH page owns audio, including before storage events arrive', () => {
  const state = browser()
  try {
    const first = state.open({ focused: true })
    const second = state.open()
    state.flush()
    assert.equal(first.focus.canPlay(), true)
    assert.equal(second.focus.canPlay(), false)
    let interruptions = 0
    first.focus.subscribe(() => { if (!first.focus.canPlay()) interruptions += 1 })
    first.setFocus(false)
    assert.equal(first.focus.canPlay(), true, 'switching to an unrelated app retains background audio')
    second.setFocus(true)
    assert.equal(first.focus.canPlay(), false, 'pending automatic callbacks must already be gated')
    assert.equal(second.focus.canPlay(), true)
    state.flush()
    assert.equal(interruptions, 1)
    second.setFocus(false)
    first.setFocus(true)
    state.flush()
    assert.equal(first.focus.canPlay(), true)
    assert.equal(second.focus.canPlay(), false)
  } finally { state.close() }
})

test('queued ownership changes cannot revive an obsolete owner', () => {
  const state = browser()
  try {
    const first = state.open({ focused: true })
    const second = state.open()
    first.setFocus(false)
    second.setFocus(true)
    second.setFocus(false)
    first.setFocus(true)
    state.flush()
    assert.equal(first.focus.canPlay(), true)
    assert.equal(second.focus.canPlay(), false)
    second.deactivate()
    state.flush()
    assert.equal(first.focus.canPlay(), true, 'disposing a non-owner must preserve the owner')
  } finally { state.close() }
})

test('pagehide releases audio and pageshow restores ownership after back/forward cache', () => {
  const state = browser()
  try {
    const first = state.open({ focused: true })
    first.target.dispatchEvent(new Event('pagehide'))
    assert.equal(first.focus.canPlay(), false)
    first.target.dispatchEvent(new Event('pageshow'))
    assert.equal(first.focus.canPlay(), true)
    first.deactivate()
    first.target.dispatchEvent(new Event('focus'))
    assert.equal(first.focus.canPlay(), false)
  } finally { state.close() }
})

test('blocked storage permits only focused playback and stops on blur', () => {
  const state = browser()
  try {
    const first = state.open({ focused: true, blocked: true })
    const second = state.open({ blocked: true })
    assert.equal(first.focus.canPlay(), true)
    assert.equal(second.focus.canPlay(), false)
    let stopped = false
    first.focus.subscribe(() => { stopped = !first.focus.canPlay() })
    first.setFocus(false)
    second.setFocus(true)
    assert.equal(stopped, true)
    assert.equal(first.focus.canPlay(), false)
    assert.equal(second.focus.canPlay(), true)
  } finally { state.close() }
})

test('resetting automatic playback drops a completed reply and still permits the next turn', () => {
  const playback = new PlaybackController()
  try {
    playback.activateSession('session')
    playback.observeSession('session', true, null)
    playback.observeSession('session', false, 'old')
    playback.resetAutomaticPlayback()
    assert.equal(playback.claimAutomaticPlayback('session', 'old'), false)
    playback.observeSession('session', true, 'old')
    playback.resetAutomaticPlayback()
    playback.observeSession('session', false, 'finished-in-background')
    assert.equal(playback.claimAutomaticPlayback('session', 'finished-in-background'), false)
    playback.observeSession('session', true, 'finished-in-background')
    playback.observeSession('session', false, 'next')
    assert.equal(playback.claimAutomaticPlayback('session', 'next'), true)
    assert.equal(playback.claimAutomaticPlayback('session', 'next'), false)
  } finally { playback.dispose() }
})
