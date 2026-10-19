import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import type { Translate } from '../../localization.js'
import { readClonedVoiceHistory, rememberClonedVoice, writeClonedVoiceHistory } from '../cloned-voice-history.js'

export function ClonedVoiceInput({ value, disabled, onChange, t }: { value: string; disabled: boolean; onChange: (value: string) => void; t: Translate }): ReactElement {
  const [history, setHistory] = useState(() => rememberClonedVoice(readClonedVoiceHistory(), value))
  useEffect(() => { writeClonedVoiceHistory(history) }, [history])
  const remember = (voice: string): void => { setHistory(previous => rememberClonedVoice(previous, voice)) }

  return <>
    <input
      type="text"
      value={value}
      disabled={disabled}
      spellCheck={false}
      aria-label={t('settings.doubaoClonedVoice')}
      placeholder={t('settings.doubaoClonedVoice')}
      aria-invalid={!value.trim()}
      onChange={event => onChange(event.target.value)}
      onBlur={() => { if (!disabled) remember(value) }}
      onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault()
          remember(value)
        }
      }}
    />
    {history.length > 0 ? <div className="xmimo-tts-cloned-voice-history" role="group" aria-label={t('settings.doubaoClonedVoiceHistory')}>
      <small>{t('settings.doubaoClonedVoiceHistory')}</small>
      {history.map(voice => <button
        key={voice}
        type="button"
        className="xmimo-tts-cloned-voice-tag"
        title={voice}
        disabled={disabled}
        aria-pressed={value.trim() === voice}
        onClick={() => { onChange(voice); remember(voice) }}
      >{voice}</button>)}
    </div> : null}
  </>
}
