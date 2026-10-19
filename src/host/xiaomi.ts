import type { ResolvedTtsSettings } from '../types/settings.js'
import { apiErrorMessage, requestMessages, upstreamModel } from './synthesis.js'
import { chatCompletionsEndpoint, completeAudioJsonLimit } from './validation.js'
import type { CompleteAudioFormat } from './validation.js'
import { readLimitedXiaomiResponse, decodeCompleteAudio } from './audio-decode.js'
import { TtsProviderError } from './provider-error.js'

function request(settings: ResolvedTtsSettings, text: string, format: string, stream: boolean, signal: AbortSignal): Promise<Response> {
  return fetch(chatCompletionsEndpoint(settings.apiKey, settings.baseURL), {
    method: 'POST', redirect: 'error', signal,
    headers: { authorization: `Bearer ${settings.apiKey.trim()}`, 'content-type': 'application/json', accept: stream ? 'text/event-stream' : 'application/json', 'user-agent': 'dsh-xiaomi-tts' },
    body: JSON.stringify({
      model: upstreamModel(settings), messages: requestMessages(settings, text),
      audio: settings.model === 'mimo-v2.5-tts-voicedesign' ? { format } : { format, voice: settings.voice }, stream,
    }),
  })
}

export async function synthesizeXiaomi(settings: ResolvedTtsSettings, text: string, format: CompleteAudioFormat, limit: number, controller: AbortController): Promise<Buffer> {
  const response = await request(settings, text, format, false, controller.signal)
  const parsed = await readLimitedXiaomiResponse(response, completeAudioJsonLimit(limit), controller)
  if (!response.ok) throw new TtsProviderError('xiaomi-api-error', apiErrorMessage(response.status, parsed), response.status)
  const audio = parsed?.choices?.[0]?.message?.audio?.data
  if (typeof audio !== 'string' || !audio) throw new TtsProviderError('invalid-xiaomi-response')
  return decodeCompleteAudio(audio, format, limit)
}

export async function streamXiaomi(settings: ResolvedTtsSettings, text: string, signal: AbortSignal): Promise<Response> {
  if (settings.model !== 'mimo-v2.5-tts') throw new TtsProviderError('streaming-model-unsupported', 'Realtime PCM requires the preset Xiaomi model.', 409)
  const response = await request(settings, text, 'pcm16', true, signal)
  if (!response.ok) {
    let parsed
    try { parsed = await response.json() } catch { /* use status */ }
    throw new TtsProviderError('xiaomi-api-error', apiErrorMessage(response.status, parsed), response.status)
  }
  if (!response.body) throw new TtsProviderError('invalid-xiaomi-response')
  return response
}
