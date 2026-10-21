import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { resolveTtsSettings, TTS_READ_SCOPES } from '../../shared.js'
import type { TtsReadScope, TtsSettings } from '../../shared.js'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { Translate } from '../localization.js'
import { readVoiceIdHistory } from './voice-id-history.js'
import {
  autoPlayWriteOps,
  buildVoiceReadingVoiceSource,
  readScopeHintKey,
  readScopeLabelKey,
  readScopeWriteOps,
  soundWriteOps,
  voiceChoiceWriteOps,
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
        <select
          className="xmimo-voice-reading-select"
          aria-label={t('settings.voiceReadingVoice')}
          value={source.value}
          disabled={disabled}
          onChange={(event) => {
            write(voiceChoiceWriteOps(source, event.currentTarget.value))
          }}
        >
          {hasStoredChoice ? null : <option value={source.value}>{t('settings.voiceReadingCustomVoice')}</option>}
          {source.choices.map((choice) => <option key={choice.value} value={choice.value}>
            {choice.detail ? `${choice.label} · ${choice.detail}` : choice.label}
          </option>)}
        </select>
      </div>
      <div className="xmimo-voice-reading-row">
        <div className="xmimo-voice-reading-copy">
          <div className="xmimo-voice-reading-row-title">{t('settings.readScope')}</div>
          <div className="xmimo-voice-reading-row-hint">{t(readScopeHintKey(settings.readScope))}</div>
        </div>
        <select
          className="xmimo-voice-reading-select"
          aria-label={t('settings.readScope')}
          value={settings.readScope}
          disabled={disabled}
          onChange={(event) => {
            write(readScopeWriteOps(event.currentTarget.value as TtsReadScope))
          }}
        >
          {TTS_READ_SCOPES.map((scope) => <option key={scope} value={scope}>{t(readScopeLabelKey(scope))}</option>)}
        </select>
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
