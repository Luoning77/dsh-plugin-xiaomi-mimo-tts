import type { ReactElement } from 'react'

export function PlaybackIcon({ state }: { state: 'play' | 'pause' | 'stop' }): ReactElement {
  return <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
    {state === 'play' ? <path d="M6 3.8a.8.8 0 0 1 1.2-.7l7.3 5.2a.85.85 0 0 1 0 1.4l-7.3 5.2a.8.8 0 0 1-1.2-.7Z" />
      : state === 'stop' ? <rect x="4" y="4" width="10" height="10" rx="1" />
        : <><rect x="4" y="3" width="3.5" height="12" rx="1" /><rect x="10.5" y="3" width="3.5" height="12" rx="1" /></>}
  </svg>
}
