import type { ReactElement } from 'react'
import { useMemo, useRef, useState } from 'react'
import { IconChevronDownOutlineRegular, Menu, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { resolveTtsSettings, TTS_READ_SCOPES } from '../../shared.js'
import type { TtsReadScope, TtsSettings } from '../../shared.js'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { Translate } from '../localization.js'
import { readVoiceIdHistory } from './voice-id-history.js'
import {
  autoPlayWriteOps,
  buildVoiceReadingVoiceSource,
  formatVoiceRate,
  formatVoiceVolume,
  rateWriteOps,
  readScopeHintKey,
  readScopeLabelKey,
  readScopeWriteOps,
  soundWriteOps,
  voiceChoiceWriteOps,
  volumeWriteOps,
  VOICE_RATE_STEPS,
  VOICE_VOLUME_STEPS,
} from './voice-reading-options.js'
import type { VoiceReadingWriteOp } from './voice-reading-options.js'
import { useSettingsSnapshot } from './scope.js'

export interface VoiceReadingSectionInjected {
  scope: ConfigForm<TtsSettings>
  t: Translate
}

export type VoiceReadingSectionProps = PropsRuntime<'settings.section'> & Partial<InjectFace<VoiceReadingSectionInjected>>

export function VoiceReadingSection(props: VoiceReadingSectionProps): ReactElement | null {
  const { scope, t } = props
  if (scope === undefined || t === undefined) return null
  return <VoiceReadingPage scope={scope} t={t} />
}

interface VoiceReadingPageProps {
  scope: ConfigForm<TtsSettings>
  t: Translate
}

interface VoiceReadingSelectProps {
  /** Accessible name of the control (the row title). */
  label: string
  /** Currently selected option id. */
  value: string
  /** Shown when the value matches no option (a stored custom id). */
  fallbackLabel?: string
  options: readonly { id: string; label: string }[]
  disabled: boolean
  onSelect: (id: string) => void
}

/**
 * Capsule selector pill plus anchored menu, mirroring the Host settings rows
 * (`packages/client/ui-chat/src/client/settings/PreferenceRow.tsx` and
 * `packages/client/locale/src/client/LanguageRow.tsx` in the harness source): a
 * borderless 36px pill on the module surface that opens the shared `Menu` with
 * a check on the selected row. Choosing returns focus to the pill before the
 * value is published, exactly like the Host rows.
 */
function VoiceReadingSelect({ label, value, fallbackLabel, options, disabled, onSelect }: VoiceReadingSelectProps): ReactElement {
  const [open, setOpen] = useState(false)
  const selectorRef = useRef<HTMLButtonElement>(null)
  const closeMenu = (): void => {
    setOpen(false)
  }
  const choose = (id: string): void => {
    selectorRef.current?.focus({ preventScroll: true })
    closeMenu()
    onSelect(id)
  }
  const selectedLabel = options.find((option) => option.id === value)?.label ?? fallbackLabel ?? value
  const selector = <button
    ref={selectorRef}
    type="button"
    className="xmimo-voice-reading-selector"
    aria-label={label}
    aria-haspopup="menu"
    aria-expanded={open}
    disabled={disabled}
    onClick={() => {
      setOpen((current) => !current)
    }}
  >
    <span className="xmimo-voice-reading-selector-label">{selectedLabel}</span>
    <IconChevronDownOutlineRegular className="xmimo-voice-reading-chevron" />
  </button>

  return <Menu
    open={open && !disabled}
    anchor={selector}
    items={options}
    selectedId={value}
    onSelect={choose}
    onClose={closeMenu}
    align="end"
    portal
    // The list is portaled to document.body, outside our subtree, so this class
    // is the only style hook that reaches the dropdown card (Menu.tsx
    // `listClassName`). voice-reading.css caps its height at 300px there.
    listClassName="xmimo-voice-reading-menu"
  />
}

function VoiceReadingPage({ scope, t }: VoiceReadingPageProps): ReactElement | null {
  const snapshot = useSettingsSnapshot(scope)
  const [clonedHistory] = useState(() => readVoiceIdHistory('cloned'))
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const settings = useMemo(() => resolveTtsSettings(snapshot.value), [snapshot.value])
  const source = useMemo(
    () => buildVoiceReadingVoiceSource(settings, clonedHistory),
    [settings, clonedHistory],
  )

  const write = (ops: VoiceReadingWriteOp[]): void => {
    if (!snapshot.writable || ops.length === 0) return
    setBusy(true)
    setFailed(false)
    void scope.mutate(ops as Parameters<ConfigForm<TtsSettings>['mutate']>[0])
      .then((ok) => {
        if (!ok) setFailed(true)
      })
      .catch(() => {
        setFailed(true)
      })
      .finally(() => {
        setBusy(false)
      })
  }

  if (snapshot.status === 'unavailable') {
    return <p className="xmimo-voice-reading-notice" role="status">{t('settings.voiceReadingUnavailable')}</p>
  }

  // The Host's first snapshot is `loading` with `writable: false`; treat that as
  // "not ready" so the page never claims the deployment is read-only while the
  // real values are still arriving.
  const ready = snapshot.status === 'ready'
  const disabled = !ready || !snapshot.writable || busy
  const hasStoredChoice = source.choices.some((choice) => choice.value === source.value)
  const voiceOptions = [
    ...(hasStoredChoice ? [] : [{ id: source.value, label: t('settings.voiceReadingCustomVoice') }]),
    ...source.choices.map((choice) => ({
      id: choice.value,
      label: choice.detail ? `${choice.label} · ${choice.detail}` : choice.label,
    })),
  ]
  const readScopeOptions = TTS_READ_SCOPES.map((option) => ({ id: option, label: t(readScopeLabelKey(option)) }))

  return <div className="xmimo-voice-reading">
    <h2 className="xmimo-voice-reading-title">{t('settings.voiceReadingTitle')}</h2>
    <p className="xmimo-voice-reading-intro">{t('settings.voiceReadingIntro')}</p>
    {ready && !snapshot.writable && <p className="xmimo-voice-reading-notice" role="status">{t('settings.voiceReadingReadOnly')}</p>}
    <div className="xmimo-voice-reading-card">
      <div className="xmimo-voice-reading-row">
        <div className="xmimo-voice-reading-copy">
          <div className="xmimo-voice-reading-row-title">{t('settings.voiceReadingVoice')}</div>
          <div className="xmimo-voice-reading-row-hint">{t(source.hintKey)}</div>
        </div>
        <VoiceReadingSelect
          label={t('settings.voiceReadingVoice')}
          value={source.value}
          options={voiceOptions}
          disabled={disabled}
          onSelect={(id) => {
            write(voiceChoiceWriteOps(source, id))
          }}
        />
      </div>
      <div className="xmimo-voice-reading-row">
        <div className="xmimo-voice-reading-copy">
          <div className="xmimo-voice-reading-row-title">{t('settings.voiceReadingVolume')}</div>
          <div className="xmimo-voice-reading-row-hint">{t('settings.voiceReadingVolumeHint')}</div>
        </div>
        <VoiceReadingSelect
          label={t('settings.voiceReadingVolume')}
          value={String(settings.voiceVolume)}
          fallbackLabel={formatVoiceVolume(settings.voiceVolume)}
          options={VOICE_VOLUME_STEPS.map((step) => ({ id: String(step), label: formatVoiceVolume(step) }))}
          disabled={disabled}
          onSelect={(id) => {
            write(volumeWriteOps(Number(id)))
          }}
        />
      </div>
      <div className="xmimo-voice-reading-row">
        <div className="xmimo-voice-reading-copy">
          <div className="xmimo-voice-reading-row-title">{t('settings.voiceReadingRate')}</div>
          <div className="xmimo-voice-reading-row-hint">{t('settings.voiceReadingRateHint')}</div>
        </div>
        <VoiceReadingSelect
          label={t('settings.voiceReadingRate')}
          value={String(settings.voiceRate)}
          fallbackLabel={formatVoiceRate(settings.voiceRate)}
          options={VOICE_RATE_STEPS.map((step) => ({ id: String(step), label: formatVoiceRate(step) }))}
          disabled={disabled}
          onSelect={(id) => {
            write(rateWriteOps(Number(id)))
          }}
        />
      </div>
      <div className="xmimo-voice-reading-row">
        <div className="xmimo-voice-reading-copy">
          <div className="xmimo-voice-reading-row-title">{t('settings.readScope')}</div>
          <div className="xmimo-voice-reading-row-hint">{t(readScopeHintKey(settings.readScope))}</div>
        </div>
        <VoiceReadingSelect
          label={t('settings.readScope')}
          value={settings.readScope}
          options={readScopeOptions}
          disabled={disabled}
          onSelect={(id) => {
            write(readScopeWriteOps(id as TtsReadScope))
          }}
        />
      </div>
      <div className="xmimo-voice-reading-row">
        <div className="xmimo-voice-reading-copy">
          <div className="xmimo-voice-reading-row-title">{t('settings.voiceReadingAutoPlay')}</div>
          <div className="xmimo-voice-reading-row-hint">{t('settings.voiceReadingAutoPlayHint')}</div>
        </div>
        <Switch
          checked={settings.autoPlay}
          disabled={disabled}
          label={t('settings.voiceReadingAutoPlay')}
          onChange={(next) => {
            write(autoPlayWriteOps(next, settings))
          }}
        />
      </div>
      <div className="xmimo-voice-reading-row">
        <div className="xmimo-voice-reading-copy">
          <div className="xmimo-voice-reading-row-title">{t('settings.voiceReadingSound')}</div>
          <div className="xmimo-voice-reading-row-hint">{t('settings.voiceReadingSoundHint')}</div>
        </div>
        <Switch
          checked={settings.soundEnabled}
          disabled={disabled}
          label={t('settings.voiceReadingSound')}
          onChange={(next) => {
            write(soundWriteOps(next, settings))
          }}
        />
      </div>
    </div>
    {failed && <p className="xmimo-voice-reading-failure" role="status">{t('settings.voiceReadingSaveFailed')}</p>}
  </div>
}
