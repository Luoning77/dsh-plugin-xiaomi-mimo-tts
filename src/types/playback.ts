export interface LiveSpeechCursor {
  sessionId: string
  turn: number
  step: number
}

export type LiveSpeechTransition = 'same-step' | 'same-turn' | 'new-turn'

/** Decide whether a live assistant update extends one message, advances within a turn, or starts a new turn. */
export function classifyLiveSpeechTransition(current: LiveSpeechCursor | null, next: LiveSpeechCursor): LiveSpeechTransition {
  if (current === null || current.sessionId !== next.sessionId || current.turn !== next.turn) return 'new-turn'
  return current.step === next.step ? 'same-step' : 'same-turn'
}

/** Serializes sentence requests and makes cancellation independent from the playback backend. */
export interface AbortableSentenceQueueOptions {
  onBusyChange?: (busy: boolean) => void
  onError?: (error: unknown) => void
}

export class AbortableSentenceQueue {
  private readonly pending: string[] = []
  private current: AbortController | null = null
  private revision = 0
  private busy = false

  constructor(
    private readonly start: (sentence: string, signal: AbortSignal) => Promise<void>,
    private readonly options: AbortableSentenceQueueOptions = {},
  ) {}

  enqueue(sentence: string): void {
    this.pending.push(sentence)
    this.setBusy(true)
    void this.pump()
  }

  cancel(): void {
    this.revision += 1
    this.pending.length = 0
    this.current?.abort()
    this.current = null
    this.setBusy(false)
  }

  private async pump(): Promise<void> {
    if (this.current !== null) return
    const sentence = this.pending.shift()
    if (sentence === undefined) {
      this.setBusy(false)
      return
    }
    const revision = this.revision
    const controller = new AbortController()
    this.current = controller
    try {
      await this.start(sentence, controller.signal)
    } catch (error) {
      if (!controller.signal.aborted && revision === this.revision) {
        this.pending.length = 0
        this.revision += 1
        this.options.onError?.(error)
      }
    } finally {
      if (this.current === controller) this.current = null
      if (revision === this.revision) {
        if (this.pending.length > 0) void this.pump()
        else this.setBusy(false)
      } else {
        this.setBusy(false)
      }
    }
  }

  private setBusy(busy: boolean): void {
    if (this.busy === busy) return
    this.busy = busy
    this.options.onBusyChange?.(busy)
  }
}
