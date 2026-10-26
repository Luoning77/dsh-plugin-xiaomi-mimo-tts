import { useEffect, useState } from 'react'

export function PreviewNotice({ message, dismissLabel }: { message: string; dismissLabel: string }) {
  const [visible, setVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!visible || hovered || focused) return
    const timer = window.setTimeout(() => { setVisible(false) }, 8000)
    return () => { window.clearTimeout(timer) }
  }, [visible, hovered, focused])

  if (!visible) return null

  return <aside
    className="preview-notice"
    onMouseEnter={() => { setHovered(true) }}
    onMouseLeave={() => { setHovered(false) }}
    onFocus={() => { setFocused(true) }}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    }}
  >
    <svg className="preview-notice-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7v.01" />
    </svg>
    <p role="status">{message}</p>
    <button type="button" aria-label={dismissLabel} title={dismissLabel} onClick={() => { setVisible(false) }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  </aside>
}
