import type { AnnouncementCollector, Announcement, AnnouncementSourceId } from './types.js'

export class AnnouncementManager {
  private readonly running = new Map<AnnouncementSourceId, AbortController>()

  constructor(
    private readonly collectors: readonly AnnouncementCollector[],
    private readonly play: (event: Announcement) => void,
    private readonly stop: (source: AnnouncementSourceId) => void,
  ) {}

  update(sources: readonly AnnouncementSourceId[], active: boolean): void {
    const wanted = new Set(active ? sources : [])
    for (const [source, controller] of this.running) {
      if (wanted.has(source)) continue
      this.running.delete(source)
      controller.abort()
      this.stop(source)
    }
    for (const collector of this.collectors) {
      if (!wanted.has(collector.id) || this.running.has(collector.id)) continue
      const controller = new AbortController()
      this.running.set(collector.id, controller)
      void collector.start({ signal: controller.signal, emit: event => {
        if (!controller.signal.aborted) this.play(event)
      } }).catch(() => {
        if (this.running.get(collector.id) === controller) {
          this.running.delete(collector.id)
          this.stop(collector.id)
        }
      })
    }
  }

  dispose(): void { this.update([], false) }
}
