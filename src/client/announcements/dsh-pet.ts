import { hostRoute } from '../host-route.js'
import type { Announcement, AnnouncementCollector } from './types.js'

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const counter = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

interface PetState {
  counter?: number
  configCounter: number | undefined
  pets: Map<string, { counter: number; data: Record<string, unknown> | null }>
}

export function parsePetState(raw: unknown): PetState | null {
  const state = object(raw)
  const pets = object(state?.pets)
  if (!state || !pets) return null
  const entries: PetState['pets'] = new Map()
  for (const [id, value] of Object.entries(pets)) {
    const say = object(object(value)?.say)
    if (say && counter(say.counter)) entries.set(id, { counter: say.counter, data: object(say.data) })
  }
  const version = object(object(state.sections)?.config)?.counter
  return {
    ...(counter(state.counter) ? { counter: state.counter } : {}),
    configCounter: counter(version) ? version : undefined,
    pets: entries,
  }
}

export function visiblePetIds(raw: unknown): Set<string> | null {
  const config = object(raw)
  if (!config || !object(config.main) || !Array.isArray(object(config.main)?.pets)) return null
  const ids = new Set<string>()
  for (const entry of Object.values(config)) {
    const pets = object(entry)?.pets
    if (!Array.isArray(pets)) continue
    for (const value of pets) {
      const pet = object(value)
      if (typeof pet?.id === 'string' && ['web', 'desktop', 'both'].includes(String(pet.display))) ids.add(pet.id)
    }
  }
  return ids
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(); return }
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve() }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}

async function readJson(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(hostRoute(path), { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) })
  if (!response.ok) throw new Error(`dsh-pet: HTTP ${response.status}`)
  return response.json()
}

export class DshPetCollector implements AnnouncementCollector {
  readonly id = 'dsh-pet' as const

  async start({ signal, emit }: { signal: AbortSignal; emit: (event: Announcement) => void }): Promise<void> {
    let previous: PetState | null = null
    const seen = new Map<string, number>()
    let visible: Set<string> | null = null
    let configVersion: number | undefined
    while (!signal.aborted) {
      try {
        const query = previous?.counter === undefined ? '' : `?since=${previous.counter}&timeout=10000`
        const state = parsePetState(await readJson(`/dsh-pet-7340/state${query}`, signal))
        if (!state) throw new Error('dsh-pet: invalid state')
        if (signal.aborted) return
        const reset = previous === null || (state.counter !== undefined && previous.counter !== undefined && state.counter < previous.counter)
          || [...state.pets].some(([id, leaf]) => leaf.counter < (seen.get(id) ?? 0))
        const changed = [...state.pets].filter(([id, leaf]) => seen.get(id) !== leaf.counter)
        // Advance before playback: filtered and busy messages must never be replayed.
        if (reset) seen.clear()
        for (const [id, leaf] of state.pets) seen.set(id, leaf.counter)
        previous = state
        // PUT /config does not always bump sections.config, so verify visibility before new speech too.
        if (reset || visible === null || configVersion !== state.configCounter || changed.length > 0) {
          visible = null
          visible = visiblePetIds(await readJson('/dsh-pet-7340/config', signal))
          configVersion = state.configCounter
          if (visible === null) throw new Error('dsh-pet: invalid config')
        }
        if (signal.aborted) return
        if (!reset) {
          for (const [id, leaf] of changed.sort((a, b) => a[1].counter - b[1].counter)) {
            const data = leaf.data
            if (!visible?.has(id) || !data || data.clear === true || data.duration === 0 || typeof data.text !== 'string' || !data.text.trim()) continue
            emit({ source: this.id, id: JSON.stringify([id, leaf.counter]), text: data.text })
          }
        }
        if (state.counter === undefined) await delay(1000, signal)
      } catch {
        if (signal.aborted) return
        previous = null
        seen.clear()
        visible = null
        await delay(5000, signal)
      }
    }
  }
}
