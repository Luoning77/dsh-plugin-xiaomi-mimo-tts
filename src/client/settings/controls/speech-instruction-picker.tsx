import type { ReactElement } from 'react'
import type { Translate } from '../../localization.js'

/** Adapted from the official instruction examples, not inline speech tags or sample dialogue.
 * https://docs.volcengine.com/docs/DoubaoVoice/DoubaoTextToSpeech20CapabilityIntroduction?lang=zh
 */
const PRESETS = [
  'Natural', 'Gentle', 'Cheerful', 'Calm', 'Story', 'Argument', 'Whisper',
  'Shy', 'Weary', 'Tearful', 'Coy', 'Cute',
  'Cantonese', 'Shanghai', 'Henan', 'Beijing', 'Tianjin', 'Sichuan', 'Shaanxi', 'Dongbei',
] as const

export function SpeechInstructionPicker({ value, disabled, minimal = false, onChange, t }: { value: string; disabled: boolean; minimal?: boolean; onChange: (value: string) => void; t: Translate }): ReactElement {
  const presets = minimal ? PRESETS.slice(0, 8) : PRESETS
  return <>
    <div className="xmimo-tts-instruction-presets" role="group" aria-label={t('settings.speechInstructionPresets')}>
      {presets.map(preset => {
        const prompt = preset === 'Natural' ? '' : t(`settings.speechInstruction${preset}Prompt`)
        return <button
          key={preset}
          type="button"
          className="xmimo-tts-instruction-tag"
          disabled={disabled}
          aria-pressed={value.trim() === prompt}
          title={prompt || t('settings.speechInstructionHint')}
          onClick={() => onChange(prompt)}
        >{t(`settings.speechInstruction${preset}`)}</button>
      })}
    </div>
    {minimal ? null : <>
      <textarea
        value={value}
        rows={3}
        disabled={disabled}
        aria-label={t('settings.speechInstruction')}
        placeholder={t('settings.speechInstructionPlaceholder')}
        onChange={event => onChange(event.target.value)}
      />
      <small>{t('settings.speechInstructionHint')}</small>
    </>}
  </>
}
