const OWNER_KEY = 'dsh-xiaomi-tts:audio-owner'

export interface AudioFocus {
  canPlay: () => boolean
  subscribe: (listener: () => void) => () => void
  claim: () => void
}

/** Used by the standalone settings preview, which has no shared DSH session. */
export const unrestrictedAudioFocus: AudioFocus = {
  canPlay: () => true,
  subscribe: () => () => {},
  claim: () => {},
}

/** The last focused DSH page keeps audio until another DSH page takes over. */
export class TabAudioFocus implements AudioFocus {
  private readonly id = crypto.getRandomValues(new Uint32Array(4)).join('-')
  private readonly listeners = new Set<() => void>()
  private storage: Storage | null = null
  private active = false
  private suspended = false
  private owned = false

  constructor(private readonly target: Window = window) {}

  canPlay = (): boolean => {
    if (!this.active || this.suspended) return false
    if (this.storage !== null) {
      try { return this.storage.getItem(OWNER_KEY) === this.id } catch { this.storage = null }
    }
    // With storage blocked, only the focused page may play.
    return this.focused()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  claim = (): void => {
    if (!this.active || this.suspended || !this.focused()) return
    if (this.storage !== null) {
      try { this.storage.setItem(OWNER_KEY, this.id) } catch { /* Preserve a readable owner if storage is full. */ }
    }
    this.refresh()
  }

  activate(): () => void {
    this.active = true
    try { this.storage = this.target.localStorage } catch { this.storage = null }
    this.target.addEventListener('focus', this.claim)
    this.target.addEventListener('blur', this.refresh)
    this.target.addEventListener('storage', this.onStorage)
    this.target.addEventListener('pagehide', this.onHide)
    this.target.addEventListener('pageshow', this.onShow)
    this.target.document.addEventListener('visibilitychange', this.onVisibility)
    this.claim()
    return () => {
      this.target.removeEventListener('focus', this.claim)
      this.target.removeEventListener('blur', this.refresh)
      this.target.removeEventListener('storage', this.onStorage)
      this.target.removeEventListener('pagehide', this.onHide)
      this.target.removeEventListener('pageshow', this.onShow)
      this.target.document.removeEventListener('visibilitychange', this.onVisibility)
      this.active = false
      this.release()
      this.refresh()
    }
  }

  private focused(): boolean {
    return this.target.document.visibilityState === 'visible' && this.target.document.hasFocus()
  }

  private refresh = (): void => {
    const owned = this.canPlay()
    if (owned === this.owned) return
    this.owned = owned
    for (const listener of this.listeners) listener()
  }

  private onStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== OWNER_KEY) return
    if (event.storageArea !== this.storage) return
    // Read the current value: queued events may describe an obsolete owner.
    if (this.storage !== null) {
      try {
        if (this.storage.getItem(OWNER_KEY) === null) this.claim()
      } catch { this.storage = null }
    }
    this.refresh()
  }

  private onVisibility = (): void => { this.claim(); this.refresh() }
  private onHide = (): void => { this.suspended = true; this.release(); this.refresh() }
  private onShow = (): void => { this.suspended = false; this.claim(); this.refresh() }

  private release(): void {
    try {
      if (this.storage?.getItem(OWNER_KEY) === this.id) this.storage.removeItem(OWNER_KEY)
    } catch { this.storage = null }
  }
}
