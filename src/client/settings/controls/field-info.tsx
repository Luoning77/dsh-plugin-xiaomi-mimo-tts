import type { ReactElement } from 'react'
import { useId, useState } from 'react'

export function FieldInfo({ label, text }: { label: string; text: string }): ReactElement {
  const id = useId()
  const [open, setOpen] = useState(false)
  return <span className="xmimo-tts-field-info" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button
      type="button"
      className="xmimo-tts-field-info-button"
      aria-label={label}
      aria-describedby={open ? id : undefined}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen(true)}
      onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); event.stopPropagation() }
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </svg>
    </button>
    {open ? <span id={id} role="tooltip" className="xmimo-tts-field-info-tooltip">{text}</span> : null}
  </span>
}
