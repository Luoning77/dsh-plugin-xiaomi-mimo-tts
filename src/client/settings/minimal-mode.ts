export const MINIMAL_MODE_STORAGE_KEY = 'dsh-xiaomi-mimo-tts:minimal-mode'
const listeners = new Set<() => void>()
let fallbackMode = false
let useFallback = false

export function subscribeMinimalMode(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent): void => {
    if (event.key === MINIMAL_MODE_STORAGE_KEY || event.key === null) listener()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function readMinimalMode(): boolean {
  try {
    if (useFallback) return fallbackMode
    const storage = getStorage()
    return storage ? storage.getItem(MINIMAL_MODE_STORAGE_KEY) === 'true' : fallbackMode
  } catch {
    return fallbackMode
  }
}

export function writeMinimalMode(enabled: boolean): void {
  fallbackMode = enabled
  try {
    const storage = getStorage()
    storage?.setItem(MINIMAL_MODE_STORAGE_KEY, String(enabled))
    useFallback = !storage
  } catch {
    useFallback = true
    // Storage may be disabled by the browser; the in-memory toggle still works.
  }
  for (const listener of listeners) listener()
}
