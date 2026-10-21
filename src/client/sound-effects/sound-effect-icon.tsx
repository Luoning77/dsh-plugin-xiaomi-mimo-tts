import type { ReactElement } from 'react'
import type { SoundCue } from './types.js'

export function SoundEffectIcon({ cue }: { cue: SoundCue }): ReactElement {
  const size = 18

  switch (cue) {
    case 'start':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M6 3.8a.8.8 0 0 1 1.2-.7l7.3 5.2a.85.85 0 0 1 0 1.4l-7.3 5.2a.8.8 0 0 1-1.2-.7Z" />
      </svg>

    case 'complete':
    case 'success':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5L7 14L3 10" />
      </svg>

    case 'error':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7" />
        <path d="M12 6L6 12M6 6l6 6" />
      </svg>

    case 'notification':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M9 2a1 1 0 0 1 1 1v.5a5 5 0 0 1 3 4.5v3l1.3 1.6a.5.5 0 0 1-.4.9H4.1a.5.5 0 0 1-.4-.9L5 11V8a5 5 0 0 1 3-4.5V3a1 1 0 0 1 1-1Z" />
        <path d="M7 14.5a2 2 0 1 0 4 0" />
      </svg>

    case 'press':
    case 'select':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="3" fill="currentColor" />
        <path d="M9 2v2M9 14v2M16 9h-2M4 9H2M14.5 3.5l-1.4 1.4M4.9 12.7l-1.4 1.4M3.5 3.5l1.4 1.4M13.1 12.7l1.4 1.4" />
      </svg>

    case 'toggle-on':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <rect x="3" y="6" width="12" height="6" rx="3" opacity="0.3" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>

    case 'toggle-off':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <rect x="3" y="6" width="12" height="6" rx="3" opacity="0.3" />
        <circle cx="6" cy="9" r="2.5" />
      </svg>

    case 'send':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M2 3a1 1 0 0 1 1.3-.95l12 4.5a1 1 0 0 1 0 1.9l-12 4.5A1 1 0 0 1 2 12V8.5L9 9 2 9.5V6Z" />
      </svg>

    case 'open':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 8V4h-4M14 4L8 10" />
        <path d="M12 12v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2" />
      </svg>

    case 'close':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 5L5 13M5 5l8 8" />
      </svg>

    case 'delete':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M6 2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h3a1 1 0 1 1 0 2h-1v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5H3a1 1 0 0 1 0-2h3V2Zm2 4a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Zm3 0a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z" />
      </svg>

    case 'stop':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <rect x="4" y="4" width="10" height="10" rx="1" />
      </svg>

    case 'queued':
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <circle cx="9" cy="9" r="7" opacity="0.3" />
        <path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>

    default:
      return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false" fill="currentColor">
        <circle cx="9" cy="9" r="7" />
      </svg>
  }
}
