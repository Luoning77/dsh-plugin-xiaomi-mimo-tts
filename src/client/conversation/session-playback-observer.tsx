import { useEffect, useRef, useState } from 'react'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import { resolveTtsSettings } from '../../shared.js'
import type { TtsSettings } from '../../shared.js'
import type { LiveSpeechController, LocalSpeechController, PlaybackController } from '../playback/index.js'
import { RealtimeSpeechSession } from '../playback/realtime-speech-session.js'
import { useSettingsSnapshot } from '../settings/scope.js'
import { assistantText, finalLiveMessage, latestAssistantMessageId } from './message-text.js'
import { useApiKeySupported } from './api-key-status.js'

interface SessionPlaybackObserverProps {
  sessionId: string
  messageId?: string
  useSession: <T>(selector: (snapshot: SessionSnapshot) => T) => T
  useChat: <T>(selector: (snapshot: ChatSnapshot) => T) => T
  playback: PlaybackController
  live: LiveSpeechController
  local: LocalSpeechController
  settings: ConfigForm<TtsSettings>
}

/** Own the active-session boundary and feed its partial assistant output into realtime speech. */
export function SessionPlaybackObserver({ sessionId, useSession, useChat, playback, live, local, settings }: SessionPlaybackObserverProps): null {
  const settingsSnapshot = useSettingsSnapshot(settings)
  const resolvedSettings = resolveTtsSettings(settingsSnapshot.value)
  const apiKeySupported = useApiKeySupported(resolvedSettings.localSpeechMode !== 'disabled')
  live.setMaxPausedPcmBytes(resolvedSettings.maxPausedPcmBytes)
  local.setVoiceURI(resolvedSettings.localVoiceURI)
  local.setTimeoutMs(resolvedSettings.requestTimeoutMs)

  const sessionSnapshot = useSession(snapshot => snapshot)
  const legacy = useChat(chat => chat.legacy)
  const runningSnapshot = sessionSnapshot.running

  const [speech] = useState(() => new RealtimeSpeechSession(live, local))
  const active = useRef<{ turn: number; step: number } | null>(null)
  const wasRunning = useRef(runningSnapshot)
  const runArmed = useRef(true)
  const latestMessageId = latestAssistantMessageId(legacy)
  const partial = legacy.partial
  const partialText = partial === null ? '' : assistantText(partial.blocks)
  const attachedMidRun = useRef(runningSnapshot)
  const resumeCheckpoint = useRef(runningSnapshot ? partial : null)
  const awaitingOpen = useRef(runningSnapshot && sessionSnapshot.openState !== 'open')

  useEffect(() => {
    active.current = null
    wasRunning.current = runningSnapshot
    runArmed.current = true
    attachedMidRun.current = runningSnapshot
    resumeCheckpoint.current = runningSnapshot ? partial : null
    awaitingOpen.current = runningSnapshot && sessionSnapshot.openState !== 'open'
    playback.activateSession(sessionId)
    speech.activate(sessionId)
    return () => {
      active.current = null
      speech.deactivate(sessionId)
      playback.deactivateSession(sessionId)
    }
  }, [playback, sessionId, speech])

  useEffect(() => {
    speech.configure({ localSpeechMode: resolvedSettings.localSpeechMode, apiKeySupported, readScope: resolvedSettings.readScope })
    const beganRun = runningSnapshot && !wasRunning.current
    wasRunning.current = runningSnapshot
    if (!runningSnapshot) runArmed.current = true
    else if (beganRun) {
      runArmed.current = true
      attachedMidRun.current = false
      resumeCheckpoint.current = null
      awaitingOpen.current = false
      speech.cancel()
      playback.cancelPlayback(sessionId)
      active.current = null
    }

    const localModel = resolvedSettings.model === 'mimo-v2.5-tts'
    const realtimeSpeechEnabled = localModel
    playback.observeSession(sessionId, runningSnapshot && runArmed.current, latestMessageId, attachedMidRun.current && realtimeSpeechEnabled)
    if (!resolvedSettings.enabled || !resolvedSettings.autoPlay || !realtimeSpeechEnabled) {
      speech.cancel()
      active.current = null
      if (runningSnapshot) runArmed.current = false
      return
    }
    if (!runArmed.current) return
    if (awaitingOpen.current) {
      if (sessionSnapshot.openState !== 'open') return
      resumeCheckpoint.current = partial
      awaitingOpen.current = false
    }
    if (partial !== null) {
      if (active.current !== null && (active.current.turn !== partial.turn || active.current.step !== partial.step)) {
        const previous = finalLiveMessage(legacy, active.current.turn, active.current.step)
        if (previous !== null) {
          speech.finish(sessionId, previous)
        }
      }
      active.current = { turn: partial.turn, step: partial.step }
      const prime = resumeCheckpoint.current !== null
        && resumeCheckpoint.current.turn === partial.turn && resumeCheckpoint.current.step === partial.step
      resumeCheckpoint.current = null
      speech.observe(sessionId, partial.turn, partial.step, partialText, prime)
      return
    }
    if (active.current !== null) {
      const final = finalLiveMessage(legacy, active.current.turn, active.current.step)
      if (final !== null) {
        speech.finish(sessionId, final)
      } else if (!runningSnapshot) {
        speech.cancel()
      }
      active.current = null
    }
  }, [apiKeySupported, legacy, latestMessageId, live, local, partial, partialText, playback, resolvedSettings.autoPlay, resolvedSettings.enabled, resolvedSettings.localSpeechMode, resolvedSettings.model, resolvedSettings.readScope, runningSnapshot, sessionId, sessionSnapshot.openState, speech])

  return null
}
