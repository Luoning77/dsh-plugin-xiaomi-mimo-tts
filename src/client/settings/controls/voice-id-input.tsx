import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { readVoiceIdHistory, rememberVoiceId, writeVoiceIdHistory } from '../voice-id-history.js'
import type { VoiceIdHistoryKind } from '../voice-id-history.js'

export function VoiceIdInput({ value, disabled, onChange, kind, label, historyLabel, rememberInitialValue = true }: { value: string; disabled: boolean; onChange: (value: string) => void; kind: VoiceIdHistoryKind; label: string; historyLabel: string; rememberInitialValue?: boolean }): ReactElement {
  const [history, setHistory] = useState(() => {
    const saved = readVoiceIdHistory(kind)
    return rememberInitialValue ? rememberVoiceId(saved, value) : saved
  })
  useEffect(() => { writeVoiceIdHistory(kind, history) }, [kind, history])
  const remember = (voice: string): void => { setHistory(previous => rememberVoiceId(previous, voice)) }

  return <>
    <input
      type="text"
      value={value}
      disabled={disabled}
      spellCheck={false}
      aria-label={label}
      placeholder={label}
      aria-invalid={!value.trim()}
      onChange={event => onChange(event.target.value)}
      onBlur={() => { if (!disabled) remember(value) }}
      onKeyDown={event => {
        if (!disabled && event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault()
          remember(value)
        }
      }}
    />
    {history.length > 0 ? <div className="xmimo-tts-voice-id-history" role="group" aria-label={historyLabel}>
      {history.map(voice => <button
        key={voice}
        type="button"
        className="xmimo-tts-voice-id-tag"
        title={voice}
        disabled={disabled}
        aria-pressed={value.trim() === voice}
        onClick={() => { onChange(voice); remember(voice) }}
      >{voice}</button>)}
    </div> : null}
  </>
}
