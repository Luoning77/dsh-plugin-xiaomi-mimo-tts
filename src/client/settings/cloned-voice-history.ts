const STORAGE_KEY = 'dsh-xiaomi-mimo-tts:cloned-voice-history'
const HISTORY_LIMIT = 10
type HistoryStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): HistoryStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function normalizeHistory(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return [...new Set(values.filter((value): value is string => typeof value === 'string').map(value => value.trim()).filter(Boolean))].slice(0, HISTORY_LIMIT)
}

export function readClonedVoiceHistory(storage = browserStorage()): string[] {
  try {
    return normalizeHistory(JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return []
  }
}

export function rememberClonedVoice(history: string[], value: string): string[] {
  return normalizeHistory([value, ...history])
}

export function writeClonedVoiceHistory(history: string[], storage = browserStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(normalizeHistory(history)))
  } catch {
    // Keep the in-memory history usable when browser storage is unavailable.
  }
}
