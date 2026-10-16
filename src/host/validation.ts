import type { ResolvedTtsSettings } from '../types/index.js'
import { TTS_MODELS, TTS_VOICES, TTS_VOICE_DESIGN_PRESETS } from '../types/index.js'
import type { SynthesizeBody } from './synthesis.js'

export function synthesisOptions(options: ResolvedTtsSettings, body: SynthesizeBody): ResolvedTtsSettings {
  const model = TTS_MODELS.includes(body.model as typeof TTS_MODELS[number])
    ? body.model as typeof TTS_MODELS[number]
    : options.model
  const voice = TTS_VOICES.includes(body.voice as typeof TTS_VOICES[number])
    ? body.voice as typeof TTS_VOICES[number]
    : options.voice
  const voiceDesignPrompt = typeof body.voiceDesignPrompt === 'string' && body.voiceDesignPrompt.trim().length > 0
    ? body.voiceDesignPrompt
    : options.voiceDesignPrompt
  return { ...options, model, voice, voiceDesignPrompt }
}

export type CompleteAudioFormat = 'mp3' | 'wav'

export function completeAudioFormat(options: ResolvedTtsSettings): CompleteAudioFormat {
  return options.format === 'wav' ? 'wav' : 'mp3'
}

export function completeAudioLimit(options: ResolvedTtsSettings, format: CompleteAudioFormat): number {
  return format === 'mp3' ? options.maxMp3AudioBytes : options.maxWavAudioBytes
}

export function completeAudioJsonLimit(audioLimit: number): number {
  return 4 * Math.ceil(audioLimit / 3) + 1024 * 1024 // TTS_AUDIO_RESPONSE_JSON_OVERHEAD_BYTES
}

export class CompleteAudioResponseError extends Error {
  constructor(readonly code: 'xiaomi-response-too-large' | 'invalid-audio-base64' | 'audio-too-large' | 'invalid-audio-format') {
    super(code)
  }
}

export function chatCompletionsEndpoint(apiKey: string, baseURL: string): string {
  const resolvedBaseURL = apiKey.trim().startsWith('tp-')
    ? 'https://token-plan-cn.xiaomimimo.com/v1'
    : baseURL

  let end = resolvedBaseURL.length
  while (end > 0 && resolvedBaseURL[end - 1] === '/') end -= 1
  const normalized = resolvedBaseURL.slice(0, end)

  const endpoint = `${normalized}/chat/completions`
  if (!URL.canParse(endpoint)) throw new Error('baseURL must be a valid absolute URL')
  return endpoint
}
