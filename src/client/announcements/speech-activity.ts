export function isSpeechBusy(status: string): boolean {
  return status === 'loading' || status === 'playing' || status === 'paused'
}

/** Queries live controllers; no duplicated playback state or global singleton. */
export class SpeechActivity {
  private readonly queries = new Set<() => boolean>()

  register(query: () => boolean): () => void {
    this.queries.add(query)
    return () => { this.queries.delete(query) }
  }

  isBusy = (): boolean => [...this.queries].some(query => query())
}
