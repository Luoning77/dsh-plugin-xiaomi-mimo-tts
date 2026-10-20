import { SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { resolveSoundEffectsMode, resolveSoundEffectsScope, SOUND_PACKS, SOUND_EFFECTS_SCOPES } from '../../shared.js'
import type { SoundEffectsMode, SoundEffectsScope, SoundPack } from '../../shared.js'
import type { Translate } from '../localization.js'
import { EnergyVolumeSlider } from './controls/energy-volume-slider.js'
import type { SoundEffectsController, SoundCue } from '../sound-effects/types.js'
import { CollapsibleModule } from './collapsible-module.js'

interface SoundEffectsPanelProps {
  t: Translate
  controller: SoundEffectsController
  enabled: boolean
  volume: number
  pack: SoundPack
  taskSounds: boolean
  clickSounds: boolean
  writable: boolean
  minimal: boolean
  open: boolean
  onToggle: () => void
  onScopeChange: (scope: SoundEffectsScope) => void
  onVolumeChange: (volume: number) => void
  onPackChange: (pack: SoundPack) => void
}

const PREVIEW_CUES = ['start', 'complete', 'error', 'notification', 'press'] as const satisfies readonly SoundCue[]

type SoundPackTone = 'neutral' | 'calm' | 'cool' | 'bright'

const SOUND_PACK_TONES: Record<SoundPack, SoundPackTone> = {
  minimal: 'neutral',
  soft: 'calm',
  glass: 'cool',
  arcade: 'bright',
  mechanical: 'bright',
  organic: 'calm',
  dreamy: 'calm',
  scifi: 'cool',
  rubber: 'bright',
  cinematic: 'cool',
  studio: 'neutral',
  zen: 'neutral',
}

/** Collapsible sound library, followed by the Broadcast Desk. */
export function SoundEffectsPanel({ t, controller, enabled, volume, pack, taskSounds, clickSounds, writable, minimal, open, onToggle, onScopeChange, onVolumeChange, onPackChange }: SoundEffectsPanelProps): ReactElement {
  const packOptionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const mode: SoundEffectsMode = resolveSoundEffectsMode(enabled, taskSounds, clickSounds)
  const modeLabel = mode === 'all'
    ? t('settings.soundEffectsOn')
    : mode === 'off'
      ? t('settings.soundEffectsOff')
      : mode === 'click'
        ? t('settings.soundEffectsClickOnly')
        : t('settings.soundEffectsTaskOnly')
  const scope = resolveSoundEffectsScope(taskSounds, clickSounds)

  useEffect(() => {
    controller.update({
      enabled,
      volume,
      pack,
      taskSounds,
      clickSounds,
    })
  }, [clickSounds, controller, enabled, pack, taskSounds, volume])

  const selectPack = (nextPack: typeof SOUND_PACKS[number]): void => {
    if (!writable || !enabled) return
    if (nextPack === pack) {
      controller.preview('press')
      return
    }

    controller.update({ enabled, volume, pack: nextPack, taskSounds, clickSounds })
    onPackChange(nextPack)
    controller.play('press')
  }

  const focusPackOption = (index: number): void => {
    const normalized = (index + SOUND_PACKS.length) % SOUND_PACKS.length
    requestAnimationFrame(() => packOptionRefs.current[normalized]?.focus())
  }

  const handlePackKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      focusPackOption(index + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      focusPackOption(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusPackOption(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusPackOption(SOUND_PACKS.length - 1)
    }
  }
  const previewLabel = (cue: SoundCue): string => t(`settings.soundEffectsPreview.${cue}` as Parameters<Translate>[0])
  return <CollapsibleModule
    className="xmimo-tts-settings-module xmimo-tts-sound-effects xmimo-ui-module"
    title={t('settings.soundEffectsTitle')}
    summary={<span className="xmimo-tts-sound-summary xmimo-ui-summary">
      <span>{modeLabel}</span>
      <span>{t('settings.soundEffectsVolume')} {Math.round(volume * 100)}%</span>
      <span>{pack}</span>
    </span>}
    open={open}
    onToggle={onToggle}
  >
    <div className="xmimo-tts-sound-body xmimo-ui-module-body">
      <SegmentedControl
        id="xmimo-tts-sound-scope"
        value={scope}
        options={SOUND_EFFECTS_SCOPES.map(value => ({ value, label: t(value === 'all' ? 'settings.soundEffectsOn' : value === 'click' ? 'settings.soundEffectsClickOnly' : 'settings.soundEffectsTaskOnly') }))}
        label={t('settings.soundEffectsScope')}
        disabled={!writable}
        onChange={onScopeChange}
        className="xmimo-tts-settings-segmented xmimo-tts-sound-scope"
      />
      <label className="xmimo-tts-sound-volume">
        <span>{t('settings.soundEffectsVolume')} {Math.round(volume * 100)}%</span>
        <EnergyVolumeSlider
          value={volume}
          label={t('settings.soundEffectsVolume')}
          minimal={minimal}
          disabled={!writable || !enabled}
          onChange={(value) => { controller.setVolume(value); onVolumeChange(value) }}
          onInteractionEnd={() => { controller.previewVolume() }}
        />
      </label>
      <div className="xmimo-tts-sound-pack">
        <span id="xmimo-tts-sound-pack-label" className={minimal ? 'xmimo-tts-visually-hidden' : undefined}>{t('settings.soundEffectsPack')}</span>
        <div className="xmimo-tts-sound-pack-grid" role="radiogroup" aria-labelledby="xmimo-tts-sound-pack-label">
          {SOUND_PACKS.map((option, index) => <button
            key={option}
            ref={(node) => { packOptionRefs.current[index] = node }}
            type="button"
            role="radio"
            data-xmimo-sound-pack-option="true"
            data-tone={SOUND_PACK_TONES[option]}
            aria-checked={pack === option}
            tabIndex={pack === option ? 0 : -1}
            className={[
              'xmimo-tts-sound-pack-option',
              pack === option ? 'xmimo-tts-sound-pack-option-selected' : '',
            ].filter(Boolean).join(' ')}
            disabled={!writable || !enabled}
            onClick={() => { selectPack(option) }}
            onKeyDown={(event) => { handlePackKeyDown(event, index) }}
          >
            <span className="xmimo-tts-sound-pack-name">{option}</span>
            <span className="xmimo-tts-sound-pack-wave" aria-hidden="true"><i /><i /><i /></span>
          </button>)}
        </div>
      </div>
      <div className="xmimo-tts-sound-preview-section">
        <span id="xmimo-tts-sound-preview-label" className={minimal ? 'xmimo-tts-visually-hidden' : undefined}>{t('settings.soundEffectsPreviewLabel')}</span>
        <div className="xmimo-tts-sound-previews" role="group" aria-labelledby="xmimo-tts-sound-preview-label">
          {PREVIEW_CUES.map(cue => <button
            key={cue}
            type="button"
            data-xmimo-sound-preview="true"
            disabled={!enabled}
            aria-label={previewLabel(cue)}
            onClick={() => { controller.preview(cue) }}
          >
            <span>{previewLabel(cue)}</span>
          </button>)}
        </div>
      </div>
      {!minimal ? <small className="xmimo-tts-sound-description">{t('settings.soundEffectsDescription')}</small> : null}
      {!minimal ? <small className="xmimo-tts-sound-supported">{t('settings.soundEffectsSupported')}</small> : null}
      {!writable ? <small>{t('settings.readOnly')}</small> : null}
    </div>
  </CollapsibleModule>
}
