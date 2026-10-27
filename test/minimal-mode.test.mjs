import assert from 'node:assert/strict'
import test from 'node:test'
import { clientModuleUrl } from './helpers/client-modules.mjs'

async function setup(t, storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const listeners = new Set()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: storage,
    addEventListener: (type, listener) => { if (type === 'storage') listeners.add(listener) },
    removeEventListener: (type, listener) => { if (type === 'storage') listeners.delete(listener) },
  } })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else delete globalThis.window
  })
  const mode = await import(`${await clientModuleUrl('src/client/settings/minimal-mode.ts')}#${t.name}`)
  return { ...mode, listeners }
}

test('minimal mode notifies mounted consumers and stops notifying after unsubscribe', async t => {
  const values = new Map()
  const mode = await setup(t, { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) })
  const observed = []
  const off = mode.subscribeMinimalMode(() => observed.push(mode.readMinimalMode()))
  assert.equal(mode.readMinimalMode(), false)
  mode.writeMinimalMode(true)
  mode.writeMinimalMode(false)
  assert.deepEqual(observed, [true, false])
  off()
  mode.writeMinimalMode(true)
  assert.deepEqual(observed, [true, false])
  assert.equal(mode.listeners.size, 0)
})

test('minimal mode reacts to cross-tab updates and storage clearing', async t => {
  let stored = null
  const mode = await setup(t, { getItem: () => stored, setItem: (_key, value) => { stored = value } })
  const observed = []
  const off = mode.subscribeMinimalMode(() => observed.push(mode.readMinimalMode()))
  t.after(off)
  stored = 'true'
  for (const listener of mode.listeners) listener({ key: mode.MINIMAL_MODE_STORAGE_KEY })
  for (const listener of mode.listeners) listener({ key: 'unrelated-setting' })
  stored = null
  for (const listener of mode.listeners) listener({ key: null })
  assert.deepEqual(observed, [true, false])
})

for (const failure of ['missing', 'blocked']) test(`minimal mode remains usable when storage is ${failure}`, async t => {
  const mode = await setup(t, failure === 'missing' ? undefined : {
    getItem: () => 'false',
    setItem: () => { throw new Error('storage blocked') },
  })
  const observed = []
  const off = mode.subscribeMinimalMode(() => observed.push(mode.readMinimalMode()))
  t.after(off)
  mode.writeMinimalMode(true)
  assert.equal(mode.readMinimalMode(), true)
  mode.writeMinimalMode(false)
  assert.equal(mode.readMinimalMode(), false)
  assert.deepEqual(observed, [true, false])
})
