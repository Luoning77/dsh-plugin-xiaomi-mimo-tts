import type { ReactElement, RefObject } from 'react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { AiFillGithub, AiOutlineGift } from 'react-icons/ai'
import {
  TTS_API_KEY_STATUS_ROUTE,
  TTS_MIMO_LOGO_ASSET_ROUTE,
  TTS_UPDATE_ROUTE,
  getSoundEffectsModeFlags,
  isSupportedTtsApiKey,
  resolveSoundEffectsScope,
  resolveTtsSettings,
} from '../../shared.js'
import { saveSettingsDraft, validateSettingsDraft, EDITABLE_SETTING_FIELDS } from './save-settings.js'
import { invalidateApiKeyStatus } from '../conversation/api-key-status.js'
import type { TtsSettings, SoundEffectsScope } from '../../shared.js'
import type { Translate } from '../localization.js'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import { PreviewPlayer } from '../playback/preview-player.js'
import type { PreviewView } from '../playback/preview-player.js'
import { isRecord, useSettingsSnapshot } from './scope.js'
import { ToggleSoundPlayer } from '../sound-effects/toggle-sound-player.js'
import type { SoundEffectsController } from '../sound-effects/types.js'
import { ApiKeyModule } from './api-key-module.js'
import { resolveApiKeyViewState } from './api-key-state.js'
import type { ApiKeyStatus } from './api-key-state.js'
import { DetailsModule } from './details-module.js'
import { PreviewModule } from './preview-module.js'
import { SoundEffectsPanel } from './sound-effects-module.js'
import { SwitchModule } from './switch-module.js'
import { readMinimalMode, writeMinimalMode } from './minimal-mode.js'
import { hostRoute } from '../host-route.js'
import type { DraftChange, DraftChanges, EditableSettingField, ResolvedSettings, SettingField, SettingsValues } from './types.js'
import type { AudioHistory } from '../history/audio-history.js'
import { AudioHistoryPage } from '../history/audio-history-page.js'
import { unrestrictedAudioFocus } from '../playback/tab-audio-focus.js'
import type { SpeechActivity } from '../announcements/speech-activity.js'
import { isSpeechBusy } from '../announcements/speech-activity.js'
import type { AudioFocus } from '../playback/tab-audio-focus.js'

interface SettingsCardProps {
  view: 'summary' | 'page'
  scope: ConfigForm<TtsSettings>
  t: Translate
  controller: SoundEffectsController
  history?: AudioHistory | undefined
  beforeHistoryPlayback?: (() => void) | undefined
  audioFocus?: AudioFocus | undefined
  speechActivity?: SpeechActivity | undefined
}

type DraftSettings = SettingsValues

const RELEASES_URL = 'https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts/releases'
const PREVIEW_TEXT_KEYS = [
  'settings.previewDefaultText',
  'settings.previewDefaultTextPoetry',
  'settings.previewDefaultTextInspiration',
  'settings.previewDefaultTextReflection',
  'settings.previewDefaultTextHumor',
] as const

function layerSettings(value: unknown): TtsSettings | undefined {
  return isRecord(value) ? value as TtsSettings : undefined
}

function hasLayerField(value: unknown, field: string): boolean {
  return isRecord(value) && Object.hasOwn(value, field)
}

function HistoryLink({ history, t, onOpen, buttonRef }: { history: AudioHistory; t: Translate; onOpen: () => void; buttonRef: RefObject<HTMLButtonElement | null> }): ReactElement {
  const view = useSyncExternalStore(history.subscribe, history.getSnapshot)
  return <Button ref={buttonRef} type="button" className="xmimo-tts-history-link" variant="toolbar" size="sm" onClick={onOpen}>
    {t('history.title')} · {view.entries.length}
  </Button>
}

export function SettingsCard(props: SettingsCardProps): ReactElement | null {
  if (props.view === 'summary') return <>{props.t('settings.description')}</>
  return <SettingsPage scope={props.scope} t={props.t} controller={props.controller} history={props.history} beforeHistoryPlayback={props.beforeHistoryPlayback} audioFocus={props.audioFocus} speechActivity={props.speechActivity} />
}

function SettingsPage({ scope, t, controller, history, beforeHistoryPlayback, speechActivity, audioFocus = unrestrictedAudioFocus }: Omit<SettingsCardProps, 'view'>): ReactElement | null {
  const snapshot = useSettingsSnapshot(scope)
  const value = snapshot.value
  const initial = resolveTtsSettings(value)
  const [apiKeys, setApiKeys] = useState({ xiaomi: '', doubao: '' })
  const [provider, setProvider] = useState(initial.provider)
  const [doubaoModel, setDoubaoModel] = useState(initial.doubaoModel)
  const [doubaoVoice, setDoubaoVoice] = useState(initial.doubaoVoice)
  const [doubaoClonedVoice, setDoubaoClonedVoice] = useState(initial.doubaoClonedVoice)
  const [doubaoInstruction, setDoubaoInstruction] = useState(initial.doubaoInstruction)
  const [instruction, setInstruction] = useState(initial.instruction)
  const apiKey = apiKeys[provider]
  const apiKeyField = provider === 'doubao' ? 'doubaoApiKey' : 'apiKey'
  const setApiKey = (next: string): void => { setApiKeys(current => ({ ...current, [provider]: next })) }
  const [announcementSources, setAnnouncementSources] = useState(initial.announcementSources)
  const [enabled, setEnabled] = useState(initial.enabled)
  const [autoPlay, setAutoPlay] = useState(initial.autoPlay)
  const [voiceVolume, setVoiceVolume] = useState(initial.voiceVolume)
  const [voiceRate, setVoiceRate] = useState(initial.voiceRate)
  const [readScope, setReadScope] = useState(initial.readScope)
  const [model, setModel] = useState(initial.model)
  const [localSpeechMode, setLocalSpeechMode] = useState(initial.localSpeechMode)
  const [localVoiceURI, setLocalVoiceURI] = useState(initial.localVoiceURI)
  const [voice, setVoice] = useState(initial.voice)
  const [voiceDesignPrompt, setVoiceDesignPrompt] = useState(initial.voiceDesignPrompt)
  const [voiceDesignCustomPrompt, setVoiceDesignCustomPrompt] = useState(initial.voiceDesignCustomPrompt)
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled)
  const [soundVolume, setSoundVolume] = useState(initial.soundVolume)
  const [soundPack, setSoundPack] = useState(initial.soundPack)
  const [taskSounds, setTaskSounds] = useState(initial.taskSounds)
  const [clickSounds, setClickSounds] = useState(initial.clickSounds)
  const [changes, setChanges] = useState<DraftChanges>({})
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [openPanel, setOpenPanel] = useState<'mixer' | 'sound' | 'broadcast' | null>(null)
  const togglePanel = (panel: 'mixer' | 'sound' | 'broadcast'): void => setOpenPanel(current => current === panel ? null : panel)
  const [previewDefaultText] = useState(() => t(PREVIEW_TEXT_KEYS[Math.floor(Math.random() * PREVIEW_TEXT_KEYS.length)]))
  const [previewText, setPreviewText] = useState(previewDefaultText)
  const [previewView, setPreviewView] = useState<PreviewView>({ status: 'idle', source: null, error: null })
  const [previewPlayer] = useState(() => new PreviewPlayer(setPreviewView, history))
  useEffect(() => speechActivity?.register(() => isSpeechBusy(previewPlayer.getView().status)), [speechActivity, previewPlayer])
  const [toggleSoundPlayer] = useState(() => new ToggleSoundPlayer())
  useEffect(() => audioFocus.subscribe(() => {
    if (audioFocus.canPlay()) return
    previewPlayer.stop()
    toggleSoundPlayer.dispose()
  }), [audioFocus, previewPlayer, toggleSoundPlayer])
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('loading')
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [minimalMode, setMinimalMode] = useState(readMinimalMode)
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyLinkRef = useRef<HTMLButtonElement>(null)
  const historyWasOpen = useRef(false)

  const accepted = resolveTtsSettings(value)
  const base = resolveTtsSettings(layerSettings(snapshot.base))
  const draft: DraftSettings = { announcementSources, provider, doubaoModel, doubaoVoice, doubaoClonedVoice, doubaoInstruction, instruction, enabled, autoPlay: enabled && autoPlay, voiceVolume, voiceRate, readScope, model, localSpeechMode, localVoiceURI, voice, voiceDesignPrompt, voiceDesignCustomPrompt, soundEnabled, soundVolume, soundPack, taskSounds, clickSounds }
  const acceptedValue = (field: EditableSettingField): ResolvedSettings[typeof field] => {
    const raw = value?.[field]
    return (raw === undefined ? accepted[field] : raw) as ResolvedSettings[typeof field]
  }
  const hasOverride = (field: SettingField): boolean => hasLayerField(snapshot.user, field)
  const fieldOverridden = (field: SettingField): boolean => {
    const change = changes[field]
    if (change?.kind === 'clear') return false
    if (change?.kind === 'set') return field === 'apiKey' ? apiKeys.xiaomi.trim().length > 0 : field === 'doubaoApiKey' ? apiKeys.doubao.trim().length > 0 : true
    return hasOverride(field)
  }
  const fieldDirty = (field: EditableSettingField): boolean => {
    const change = changes[field]
    if (change === undefined) return false
    if (change.kind === 'clear') return hasOverride(field)
    return field === 'announcementSources' ? JSON.stringify(draft[field]) !== JSON.stringify(acceptedValue(field)) : !Object.is(draft[field], acceptedValue(field))
  }
  const apiKeyDirty = (['apiKey', 'doubaoApiKey'] as const).some(field => changes[field]?.kind === 'clear' ? hasOverride(field) : changes[field]?.kind === 'set' && apiKeys[field === 'apiKey' ? 'xiaomi' : 'doubao'].trim().length > 0)
  const dirty = EDITABLE_SETTING_FIELDS.some(fieldDirty) || apiKeyDirty
  const validationError = validateSettingsDraft(draft)
  const apiKeyViewState = resolveApiKeyViewState(apiKey, isSupportedTtsApiKey(apiKey, provider), apiKeyStatus, changes[apiKeyField]?.kind)
  const apiKeyMessage = t(apiKeyViewState === 'loading'
    ? 'settings.apiKeyLoading'
    : apiKeyViewState === 'missing'
      ? 'settings.apiKeyMissing'
      : apiKeyViewState === 'recognized'
        ? provider === 'doubao' ? 'settings.doubaoKeyConfigured' : 'settings.apiKeyRecognized'
        : apiKeyViewState === 'unrecognized'
          ? 'settings.apiKeyUnsupportedSaved'
          : apiKeyViewState === 'unavailable'
            ? 'settings.apiKeyUnavailable'
            : apiKeyViewState === 'pending-save'
              ? 'settings.apiKeyPendingSave'
              : apiKeyViewState === 'pending-clear'
                ? 'settings.apiKeyPendingClear'
                : 'settings.apiKeyUnsupported')
  const apiKeyInvalid = apiKeyViewState === 'pending-invalid' || apiKeyViewState === 'unrecognized'
  const apiKeyClearable = hasOverride(apiKeyField) && changes[apiKeyField]?.kind !== 'clear'

  useEffect(() => {
    if (snapshot.status === 'unavailable') return
    let active = true
    setApiKeyStatus('loading')
    void fetch(`${hostRoute(TTS_API_KEY_STATUS_ROUTE)}?provider=${provider}`, { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('api-key-status-failed')
        return await response.json() as { configured?: unknown; supported?: unknown }
      })
      .then((status) => {
        if (!active) return
        setApiKeyStatus(status.configured !== true ? 'missing' : status.supported === true ? 'recognized' : 'unrecognized')
      })
      .catch(() => {
        if (active) setApiKeyStatus('unavailable')
      })
    return () => { active = false }
  }, [provider, snapshot.status, value])

  useEffect(() => {
    let active = true
    void fetch(hostRoute(TTS_UPDATE_ROUTE), { cache: 'no-store', headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('version-check-failed')
        return await response.json() as { latestVersion?: unknown; updateAvailable?: unknown }
      })
      .then((result) => {
        if (!active) return
        setLatestVersion(result.updateAvailable === true && typeof result.latestVersion === 'string' ? result.latestVersion : null)
      })
      .catch(() => { if (active) setLatestVersion(null) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (dirty) return
    const next = resolveTtsSettings(value)
    setProvider(next.provider)
    setDoubaoModel(next.doubaoModel)
    setDoubaoVoice(next.doubaoVoice)
    setDoubaoClonedVoice(next.doubaoClonedVoice)
    setDoubaoInstruction(next.doubaoInstruction)
    setInstruction(next.instruction)
    setAnnouncementSources(next.announcementSources)
    setEnabled(next.enabled)
    setAutoPlay(next.autoPlay)
    setVoiceVolume(next.voiceVolume)
    setVoiceRate(next.voiceRate)
    setReadScope(next.readScope)
    setModel(next.model)
    setLocalSpeechMode(next.localSpeechMode)
    setLocalVoiceURI(next.localVoiceURI)
    setVoice(next.voice)
    setVoiceDesignPrompt(next.voiceDesignPrompt)
    setVoiceDesignCustomPrompt(next.voiceDesignCustomPrompt)
    setSoundEnabled(next.soundEnabled)
    setSoundVolume(next.soundVolume)
    setSoundPack(next.soundPack)
    setTaskSounds(next.taskSounds)
    setClickSounds(next.clickSounds)
    setChanges({})
  }, [dirty, value])

  useEffect(() => () => {
    toggleSoundPlayer.dispose()
    void previewPlayer.dispose()
  }, [previewPlayer, toggleSoundPlayer])

  useEffect(() => { toggleSoundPlayer.setEnabled(!minimalMode) }, [minimalMode, toggleSoundPlayer])

  useEffect(() => { previewPlayer.setVolume(voiceVolume); toggleSoundPlayer.setVolume(voiceVolume) }, [previewPlayer, toggleSoundPlayer, voiceVolume])

  useEffect(() => {
    if (!historyOpen && historyWasOpen.current) historyLinkRef.current?.focus({ preventScroll: true })
    historyWasOpen.current = historyOpen
  }, [historyOpen])

  if (snapshot.status === 'unavailable') return null

  const markChange = (field: SettingField, kind: DraftChange['kind'] = 'set'): void => {
    setChanges((current) => ({ ...current, [field]: { kind } }))
    setState('idle')
  }

  const resetField = (field: EditableSettingField): void => {
    previewPlayer.stop()
    markChange(field, 'clear')
    if (field === 'provider') setProvider(base.provider)
    if (field === 'doubaoModel') setDoubaoModel(base.doubaoModel)
    if (field === 'doubaoVoice') setDoubaoVoice(base.doubaoVoice)
    if (field === 'doubaoClonedVoice') setDoubaoClonedVoice(base.doubaoClonedVoice)
    if (field === 'doubaoInstruction') setDoubaoInstruction(base.doubaoInstruction)
    if (field === 'instruction') setInstruction(base.instruction)
    if (field === 'announcementSources') setAnnouncementSources(base.announcementSources)
    if (field === 'enabled') setEnabled(base.enabled)
    if (field === 'autoPlay') setAutoPlay(base.autoPlay)
    if (field === 'voiceVolume') setVoiceVolume(base.voiceVolume)
    if (field === 'voiceRate') setVoiceRate(base.voiceRate)
    if (field === 'readScope') setReadScope(base.readScope)
    if (field === 'model') setModel(base.model)
    if (field === 'localSpeechMode') setLocalSpeechMode(base.localSpeechMode)
    if (field === 'localVoiceURI') setLocalVoiceURI(base.localVoiceURI)
    if (field === 'voice') setVoice(base.voice)
    if (field === 'voiceDesignPrompt') setVoiceDesignPrompt(base.voiceDesignPrompt)
    if (field === 'voiceDesignCustomPrompt') setVoiceDesignCustomPrompt(base.voiceDesignCustomPrompt)
    if (field === 'soundEnabled') setSoundEnabled(base.soundEnabled)
    if (field === 'soundVolume') setSoundVolume(base.soundVolume)
    if (field === 'soundPack') setSoundPack(base.soundPack)
    if (field === 'taskSounds') setTaskSounds(base.taskSounds)
    if (field === 'clickSounds') setClickSounds(base.clickSounds)
  }

  const clearApiKey = (): void => {
    setApiKey('')
    markChange(apiKeyField, 'clear')
  }

  const discard = (): void => {
    const next = resolveTtsSettings(scope.getSnapshot().value)
    setProvider(next.provider)
    setDoubaoModel(next.doubaoModel)
    setDoubaoVoice(next.doubaoVoice)
    setDoubaoClonedVoice(next.doubaoClonedVoice)
    setDoubaoInstruction(next.doubaoInstruction)
    setInstruction(next.instruction)
    setAnnouncementSources(next.announcementSources)
    setEnabled(next.enabled)
    setAutoPlay(next.autoPlay)
    setVoiceVolume(next.voiceVolume)
    setVoiceRate(next.voiceRate)
    setReadScope(next.readScope)
    setModel(next.model)
    setLocalSpeechMode(next.localSpeechMode)
    setLocalVoiceURI(next.localVoiceURI)
    setVoice(next.voice)
    setVoiceDesignPrompt(next.voiceDesignPrompt)
    setVoiceDesignCustomPrompt(next.voiceDesignCustomPrompt)
    setSoundEnabled(next.soundEnabled)
    setSoundVolume(next.soundVolume)
    setSoundPack(next.soundPack)
    setTaskSounds(next.taskSounds)
    setClickSounds(next.clickSounds)
    setApiKeys({ xiaomi: '', doubao: '' })
    previewPlayer.stop()
    setChanges({})
    setState('idle')
  }

  const save = async (): Promise<void> => {
    setOpenPanel(null)
    setState('saving')
    try {
      await saveSettingsDraft(scope, draft, changes, apiKeys)
      if (changes.apiKey !== undefined || changes.doubaoApiKey !== undefined) invalidateApiKeyStatus()
      setApiKeys({ xiaomi: '', doubao: '' })
      setChanges({})
      setState('saved')
    } catch {
      setState('failed')
    }
  }

  const previewBusy = previewView.status === 'loading' || previewView.status === 'playing'

  const togglePreview = (text: string): void => {
    audioFocus.claim()
    if (!audioFocus.canPlay()) return
    if (previewBusy) {
      previewPlayer.stop()
      return
    }
    if (validationError !== null || changes[apiKeyField] !== undefined) {
      setPreviewView({ status: 'error', source: provider === 'doubao' ? 'doubao' : 'mimo', error: validationError !== null ? 'voice-required' : 'save-key-first' })
      return
    }
    beforeHistoryPlayback?.()
    void previewPlayer.play(text, {
      provider, doubaoModel, doubaoVoice, doubaoClonedVoice, doubaoInstruction, instruction,
      model,
      localSpeechMode,
      localVoiceURI,
      voice,
      voiceDesignPrompt,
      voiceVolume,
      voiceRate,
    })
  }

  const toggleSettingsPreview = (): void => { togglePreview(previewText) }

  const changeEnabled = (next: boolean): void => {
    if (minimalMode && soundEnabled && clickSounds) controller.play(next ? 'toggle-on' : 'toggle-off')
    else toggleSoundPlayer.schedule(next ? 'on' : 'off')
    setEnabled(next)
    if (!next) {
      previewPlayer.stop()
      setAutoPlay(false)
      setChanges((current) => ({ ...current, enabled: { kind: 'set' }, autoPlay: { kind: 'set' } }))
    } else {
      markChange('enabled')
    }
    setState('idle')
  }

  const changeAutoPlay = (next: boolean): void => {
    if (minimalMode && soundEnabled && clickSounds) controller.play(next ? 'toggle-on' : 'toggle-off')
    else toggleSoundPlayer.schedule(next ? 'auto-on' : 'auto-off')
    setAutoPlay(next)
    if (next) {
      setEnabled(true)
      setChanges((current) => ({ ...current, autoPlay: { kind: 'set' }, enabled: { kind: 'set' } }))
    } else {
      markChange('autoPlay')
    }
    setState('idle')
  }

  const changeSoundScope = (scope: SoundEffectsScope): void => {
    const flags = getSoundEffectsModeFlags(scope)
    controller.update({ enabled: soundEnabled, taskSounds: flags.taskSounds, clickSounds: flags.clickSounds, volume: soundVolume, pack: soundPack })
    setTaskSounds(flags.taskSounds)
    setClickSounds(flags.clickSounds)
    setChanges(current => ({ ...current, taskSounds: { kind: 'set' }, clickSounds: { kind: 'set' } }))
    setState('idle')
  }

  const changeSoundEnabled = (next: boolean): void => {
    const flags = getSoundEffectsModeFlags(resolveSoundEffectsScope(taskSounds, clickSounds))
    if (!next && soundEnabled && clickSounds) controller.play('toggle-off')
    controller.update({ enabled: next, taskSounds: flags.taskSounds, clickSounds: flags.clickSounds, volume: soundVolume, pack: soundPack })
    if (next && flags.clickSounds) controller.play('toggle-on')
    setSoundEnabled(next)
    setTaskSounds(flags.taskSounds)
    setClickSounds(flags.clickSounds)
    setChanges(current => ({ ...current, soundEnabled: { kind: 'set' }, taskSounds: { kind: 'set' }, clickSounds: { kind: 'set' } }))
    setState('idle')
  }

  const toggleMinimalMode = (): void => {
    const next = !minimalMode
    setMinimalMode(next)
    writeMinimalMode(next)
    toggleSoundPlayer.setEnabled(!next)
    if (next) previewPlayer.stop()
  }

  if (historyOpen && history) return <AudioHistoryPage history={history} t={t} volume={voiceVolume} voiceRate={voiceRate} minimalMode={minimalMode} speechActivity={speechActivity}
    beforePlayback={() => {
      audioFocus.claim()
      previewPlayer.stop()
      toggleSoundPlayer.dispose()
      beforeHistoryPlayback?.()
    }} onBack={() => { setHistoryOpen(false) }} />

  return (
    <div className={minimalMode ? 'xmimo-tts-card xmimo-tts-card-open xmimo-ui-scope xmimo-tts-card-minimal' : 'xmimo-tts-card xmimo-tts-card-open xmimo-ui-scope'}>
      <div className="xmimo-tts-card-body xmimo-ui-stack">
        <SwitchModule
          t={t}
          enabled={enabled}
          autoPlay={autoPlay}
          soundEnabled={soundEnabled}
          minimal={minimalMode}
          writable={snapshot.writable}
          onEnabledChange={changeEnabled}
          onAutoPlayChange={changeAutoPlay}
          onSoundEnabledChange={changeSoundEnabled}
        />
        <ApiKeyModule
          t={t}
          provider={provider}
          onProviderChange={next => { previewPlayer.stop(); setProvider(next); markChange('provider') }}
          value={apiKey}
          message={apiKeyMessage}
          invalid={apiKeyInvalid}
          clearable={apiKeyClearable}
          writable={snapshot.writable}
          minimal={minimalMode}
          onChange={(next) => { setApiKey(next); markChange(apiKeyField) }}
          onClear={clearApiKey}
        />
        {enabled ? <DetailsModule
          t={t}
          provider={provider}
          doubaoModel={doubaoModel}
          doubaoVoice={doubaoVoice}
          doubaoClonedVoice={doubaoClonedVoice}
          speechInstruction={provider === 'doubao' ? doubaoInstruction : instruction}
          onSpeechInstructionChange={next => {
            previewPlayer.stop()
            if (provider === 'doubao') { setDoubaoInstruction(next); markChange('doubaoInstruction') }
            else { setInstruction(next); markChange('instruction') }
          }}
          onDoubaoModelChange={next => { previewPlayer.stop(); setDoubaoModel(next); markChange('doubaoModel') }}
          onDoubaoVoiceChange={next => { previewPlayer.stop(); setDoubaoVoice(next); markChange('doubaoVoice') }}
          onDoubaoClonedVoiceChange={next => { previewPlayer.stop(); setDoubaoClonedVoice(next); markChange('doubaoClonedVoice') }}
          open={openPanel === 'mixer'}
          minimal={minimalMode}
          writable={snapshot.writable}
          autoPlay={autoPlay}
          voiceVolume={voiceVolume}
          voiceRate={voiceRate}
          readScope={readScope}
          model={model}
          localSpeechMode={localSpeechMode}
          localVoiceURI={localVoiceURI}
          voice={voice}
          voiceDesignPrompt={voiceDesignPrompt}
          voiceDesignCustomPrompt={voiceDesignCustomPrompt}
          fieldOverridden={fieldOverridden}
          resetField={resetField}
          onToggle={() => togglePanel('mixer')}
          onVoiceVolumeChange={(next) => { previewPlayer.setVolume(next); toggleSoundPlayer.setPreviewVolume(next); setVoiceVolume(next); markChange('voiceVolume') }}
          onVoiceVolumeInteractionEnd={(next) => { if (minimalMode) controller.previewVolume(); else toggleSoundPlayer.previewVolume(next) }}
          onVoiceRateChange={(next) => { setVoiceRate(next); markChange('voiceRate') }}
          onVoiceRateInteractionEnd={(next) => { controller.play('success', { playbackRate: next }) }}
          onReadScopeChange={(next) => { setReadScope(next); markChange('readScope') }}
          onModelChange={(nextModel) => { previewPlayer.stop(); setModel(nextModel); markChange('model') }}
          onVoiceDesignPromptChange={(next) => {
            setVoiceDesignPrompt(next)
            setVoiceDesignCustomPrompt(next)
            setChanges((current) => ({ ...current, voiceDesignPrompt: { kind: 'set' }, voiceDesignCustomPrompt: { kind: 'set' } }))
            setState('idle')
          }}
          onVoiceChange={(next) => { previewPlayer.stop(); setVoice(next); markChange('voice') }}
          onLocalVoiceURIChange={(next) => { setLocalVoiceURI(next); markChange('localVoiceURI') }}
          onLocalSpeechModeChange={(next) => { setLocalSpeechMode(next); markChange('localSpeechMode') }}
        /> : null}
        <SoundEffectsPanel
          t={t}
          controller={controller}
          enabled={soundEnabled}
          volume={soundVolume}
          pack={soundPack}
          taskSounds={taskSounds}
          clickSounds={clickSounds}
          writable={snapshot.writable}
          minimal={minimalMode}
          open={openPanel === 'sound'}
          onToggle={() => togglePanel('sound')}
          onScopeChange={changeSoundScope}
          onVolumeChange={(next) => { setSoundVolume(next); markChange('soundVolume') }}
          onPackChange={(next) => { setSoundPack(next); markChange('soundPack') }}
        />
        <PreviewModule
          t={t}
          enabled={enabled}
          open={openPanel === 'broadcast'}
          onToggleOpen={() => togglePanel('broadcast')}
          status={previewView.status}
          source={previewView.source}
          error={previewView.error}
          text={previewText}
          onToggle={toggleSettingsPreview}
          onTextChange={setPreviewText}
          sources={announcementSources}
          writable={snapshot.writable}
          overridden={fieldOverridden('announcementSources')}
          onReset={() => resetField('announcementSources')}
          onChange={next => { setAnnouncementSources(next); markChange('announcementSources') }}
        />
        <div className="xmimo-tts-card-actions">
          {latestVersion !== null
            ? <a className="xmimo-tts-update" href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
              <AiOutlineGift size={14} aria-hidden="true" focusable="false" />
              {t('settings.updateAvailable')}
            </a>
            : null}
          <div className="xmimo-tts-card-action-links">
            <a
              className="xmimo-tts-star"
              href="https://github.com/ppy-web/dsh-plugin-xiaomi-mimo-tts"
              target="_blank"
              rel="noopener noreferrer"
            >
              <AiFillGithub size={14} aria-hidden="true" focusable="false" />
              {t('settings.source')}
            </a>
            {history ? <HistoryLink history={history} t={t} buttonRef={historyLinkRef} onOpen={() => {
              previewPlayer.stop()
              toggleSoundPlayer.dispose()
              setHistoryOpen(true)
            }} /> : null}
          </div>
          {!snapshot.writable ? <span>{t('settings.readOnly')}</span> : null}
          {state === 'saved' && !dirty ? <span role="status">{t('settings.saved')}</span> : null}
          {validationError !== null ? <span role="alert" className="xmimo-tts-failed">{t('settings.doubaoVoiceRequired')}</span> : null}
          {state === 'failed' ? <span className="xmimo-tts-failed" role="status">{t('settings.failed')}</span> : null}
          <Button
            type="button"
            variant="toolbar"
            size="sm"
            className="xmimo-tts-mode-toggle"
            aria-pressed={minimalMode}
            aria-label={`${t('settings.minimalMode')}: ${t(minimalMode ? 'settings.minimalModeOn' : 'settings.minimalModeOff')}`}
            onClick={toggleMinimalMode}
          >
            {t(minimalMode ? 'settings.defaultModeShort' : 'settings.minimalModeShort')}
          </Button>
          <Button type="button" variant="outline" size="sm" className="xmimo-tts-discard" disabled={!snapshot.writable || !dirty || state === 'saving'} onClick={discard}>
            {t('settings.discard')}
          </Button>
          <Button type="button" variant="primary" size="sm" className="xmimo-tts-save" disabled={!snapshot.writable || !dirty || state === 'saving' || validationError !== null} onClick={() => { void save() }}>
            {state === 'saving' ? t('settings.saving') : t('settings.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
