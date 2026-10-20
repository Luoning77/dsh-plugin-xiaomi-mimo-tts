import type { Announcement, AnnouncementCollector } from './types.js'

export interface QuestionTitle { id: string; text: string; visible: boolean }

export class QuestionTitleTracker {
  private readonly seen = new Set<string>()
  private baseline = true
  private current: { id: string; controller: AbortController } | null = null

  constructor(private readonly emit: (event: Announcement) => void) {}

  cancel(): void { this.current?.controller.abort(); this.current = null }
  reset(): void { this.cancel(); this.baseline = true }

  update(titles: readonly QuestionTitle[]): void {
    const title = titles.find(title => title.visible)
    if (this.current?.id !== title?.id) this.cancel()
    if (this.baseline) {
      for (const item of titles) this.seen.add(item.id)
      this.baseline = false
      return
    }
    if (!title || this.seen.has(title.id)) return
    this.seen.add(title.id)
    this.current = { id: title.id, controller: new AbortController() }
    this.emit({ source: 'question-titles', id: title.id, text: title.text, signal: this.current.controller.signal })
  }
}

/** Read only the labelled h2, never option, detail, or button text. */
export function questionTitles(document: Document, session: string): QuestionTitle[] {
  const out: QuestionTitle[] = []
  for (const frame of Array.from(document.querySelectorAll<HTMLElement>('[data-question-key]'))) {
    const key = frame.dataset.questionKey
    const owner = frame.closest('[data-session-id]')?.getAttribute('data-session-id')
    if (!key || (owner && owner !== session)) continue
    for (const section of Array.from(frame.querySelectorAll<HTMLElement>('section[aria-labelledby]'))) {
      const title = (section.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => document.getElementById(id))
        .find(element => element?.tagName === 'H2' && section.contains(element))
      const text = title?.textContent?.trim()
      if (!title || !text) continue
      const collapsed = section.querySelector<HTMLButtonElement>('header button[aria-expanded="false"]')
      const submitting = section.querySelector<HTMLButtonElement>('header button[aria-expanded]')?.disabled
      const visible = !collapsed && !submitting && !section.closest('[hidden], [inert], [aria-hidden="true"]')
        && section.getClientRects().length > 0 && document.defaultView?.getComputedStyle(section).visibility !== 'hidden'
      out.push({ id: JSON.stringify([session, key, title.id]), text, visible })
    }
  }
  return out
}

export class QuestionTitleCollector implements AnnouncementCollector {
  readonly id = 'question-titles' as const
  private session: string | null = null
  private refresh: (() => void) | null = null
  private reset: (() => void) | null = null

  constructor(private readonly document: Document = window.document) {}

  activateSession(session: string): () => void {
    this.session = session
    this.reset?.()
    // Read the committed DOM after other session-scoped effects have run.
    queueMicrotask(() => this.refresh?.())
    return () => {
      if (this.session !== session) return
      this.session = null
      this.reset?.()
    }
  }

  async start({ signal, emit }: { signal: AbortSignal; emit: (event: Announcement) => void }): Promise<void> {
    if (signal.aborted) return
    const tracker = new QuestionTitleTracker(emit)
    const scan = () => {
      if (signal.aborted || this.session === null) { tracker.cancel(); return }
      tracker.update(questionTitles(this.document, this.session))
    }
    const reset = () => tracker.reset()
    this.refresh = scan
    this.reset = reset
    const observer = new MutationObserver(scan)
    observer.observe(this.document.body, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['aria-labelledby', 'aria-hidden', 'aria-expanded', 'hidden', 'inert', 'disabled', 'style', 'class', 'data-question-key', 'data-session-id'] })
    scan()
    await new Promise<void>(resolve => {
      const cleanup = () => {
        observer.disconnect()
        tracker.cancel()
        if (this.refresh === scan) { this.refresh = null; this.reset = null }
        signal.removeEventListener('abort', cleanup)
        resolve()
      }
      signal.addEventListener('abort', cleanup, { once: true })
      if (signal.aborted) cleanup()
    })
  }
}
