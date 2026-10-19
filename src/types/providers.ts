import type { TtsModel } from './models.js'
import type { ResolvedTtsSettings } from './settings.js'
import { normalizeVoiceRate } from '../utils/encoding.js'

export const TTS_PROVIDERS = ['xiaomi', 'doubao'] as const
export type TtsProvider = typeof TTS_PROVIDERS[number]
export const DOUBAO_TTS_MODELS = ['seed-tts-2.0', 'seed-icl-2.0'] as const
export type DoubaoTtsModel = typeof DOUBAO_TTS_MODELS[number]

/** Public synthesis selection. Secrets and upstream addresses are Host-only. */
export type TtsSelection =
  | { provider: 'xiaomi'; model: TtsModel; voice: string; voiceDesignPrompt: string }
  | { provider: 'doubao'; model: DoubaoTtsModel; voice: string; voiceRate?: number; speechInstruction?: string }

export function ttsSelection(settings: ResolvedTtsSettings): TtsSelection {
  return settings.provider === 'doubao'
    ? { provider: 'doubao', model: settings.doubaoModel, voice: settings.doubaoModel === 'seed-icl-2.0' ? settings.doubaoClonedVoice : settings.doubaoVoice, voiceRate: normalizeVoiceRate(settings.voiceRate), ...(settings.doubaoModel === 'seed-tts-2.0' ? { speechInstruction: settings.doubaoInstruction.trim() } : {}) }
    : { provider: 'xiaomi', model: settings.model, voice: settings.voice, voiceDesignPrompt: settings.voiceDesignPrompt }
}

export function supportsRealtimeTts(settings: ResolvedTtsSettings): boolean {
  return settings.provider === 'doubao' || settings.model === 'mimo-v2.5-tts'
}

export function ttsApiKey(settings: ResolvedTtsSettings): string {
  return (settings.provider === 'doubao' ? settings.doubaoApiKey : settings.apiKey).trim()
}
