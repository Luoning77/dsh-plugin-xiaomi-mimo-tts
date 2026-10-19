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

export function DoubaoInstructionPicker({ value, disabled, minimal = false, onChange, t }: { value: string; disabled: boolean; minimal?: boolean; onChange: (value: string) => void; t: Translate }): ReactElement {
  const presets = minimal ? PRESETS.slice(0, 8) : PRESETS
  return <>
    <div className="xmimo-tts-instruction-presets" role="group" aria-label={t('settings.doubaoInstructionPresets')}>
      {presets.map(preset => {
        const prompt = preset === 'Natural' ? '' : t(`settings.doubaoInstruction${preset}Prompt`)
        return <button
          key={preset}
          type="button"
          className="xmimo-tts-instruction-tag"
          disabled={disabled}
          aria-pressed={value.trim() === prompt}
          title={prompt || t('settings.doubaoInstructionHint')}
          onClick={() => onChange(prompt)}
        >{t(`settings.doubaoInstruction${preset}`)}</button>
      })}
    </div>
    {minimal ? null : <>
      <textarea
        value={value}
        rows={3}
        disabled={disabled}
        aria-label={t('settings.doubaoInstruction')}
        placeholder={t('settings.doubaoInstructionPlaceholder')}
        onChange={event => onChange(event.target.value)}
      />
      <small>{t('settings.doubaoInstructionHint')}</small>
    </>}
  </>
}
