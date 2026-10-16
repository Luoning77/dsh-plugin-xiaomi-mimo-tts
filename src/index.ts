import type { Context, Volatile } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createRequire } from 'node:module'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { debugConsole } from './debug-console.js'
import {
  TTS_SETTINGS_NAMESPACE,
  TTS_ROUTE,
  TTS_STREAM_ROUTE,
  TTS_UPDATE_ROUTE,
  TTS_API_KEY_STATUS_ROUTE,
  TTS_MIMO_LOGO_ASSET_ROUTE,
  TTS_VOICE_DESIGN_ASSET_ROUTE,
  TTS_VOICE_ASSET_ROUTE,
  TTS_TOGGLE_CHARACTER_ASSET_ROUTE,
  TTS_SOUND_EFFECTS_CHARACTER_ASSET_ROUTE,
  TTS_API_KEY_WHALE_ASSET_ROUTE,
  TTS_MIXER_WHALE_ASSET_ROUTE,
  TTS_PREVIEW_WHALE_ASSET_ROUTE,
  TTS_HISTORY_EMPTY_ASSET_ROUTE,
  TTS_SOUND_EFFECTS_WHALE_ASSET_ROUTE,
  TTS_SOUND_EFFECT_CUES_ASSET_ROUTE,
  TTS_TOGGLE_AUDIO_ASSET_ROUTE,
  TTS_TOGGLE_SOUND_FILES,
  TTS_VOLUME_PREVIEW_FILES,
  TTS_VERSION,
} from './constants.js'
import {
  TTS_MODELS,
  TTS_LOCAL_SPEECH_MODES,
  TTS_FORMATS,
  TTS_VOICE_DESIGN_PLAYBACK_MODES,
  TTS_READ_SCOPES,
  TTS_VOICES,
  TTS_VOICE_PRESETS,
  TTS_VOICE_DESIGN_PRESETS,
  SOUND_PACKS,
  DEFAULT_TTS_SETTINGS,
  isSupportedTtsApiKey,
  resolveTtsBaseURL,
} from './types/index.js'
import { prepareTtsText, isNewerTtsVersion } from './text/index.js'
import {
  registerStaticAsset,
  registerStaticAssetMap,
  json,
  readJsonBody,
  apiErrorMessage,
  requestMessages,
  upstreamModel,
  synthesisOptions,
  completeAudioFormat,
  completeAudioLimit,
  completeAudioJsonLimit,
  chatCompletionsEndpoint,
  CompleteAudioResponseError,
  readLimitedXiaomiResponse,
  decodeCompleteAudio,
} from './host/index.js'
import type { SynthesizeBody, XiaomiAudioResponse } from './host/index.js'

const packageJson = createRequire(import.meta.url)('../package.json') as { version?: unknown }
const USER_AGENT = typeof packageJson.version === 'string'
  ? `dsh-xiaomi-tts/${packageJson.version}`
  : 'dsh-xiaomi-tts'
const NPM_LATEST_URL = 'https://registry.npmjs.org/dsh-xiaomi-tts/latest'
const STREAM_HOST_LOG = '[MiMoTTS Host]'
let nextHostStreamRequestId = 1

/** Cordis plugin identifier. */
export const name = 'xiaomi-mimo-tts'

/** Host services required by this plugin. */
export const inject = ['webServer']

/** Settings namespace registered with the DSH Host. */
export const XIAOMI_MIMO_TTS_SETTINGS_NAMESPACE = TTS_SETTINGS_NAMESPACE

/** Validated Host settings schema. */
export const Config = z.object({
  enabled: z.boolean().default(DEFAULT_TTS_SETTINGS.enabled).volatile(),
  apiKey: z.string().role('secret').default(DEFAULT_TTS_SETTINGS.apiKey).volatile(),
  baseURL: z.string().pattern(/^https?:\/\/\S+$/iu).default(DEFAULT_TTS_SETTINGS.baseURL).volatile(),
  model: z.union(TTS_MODELS).default(DEFAULT_TTS_SETTINGS.model).volatile(),
  localSpeechMode: z.union(TTS_LOCAL_SPEECH_MODES).default(DEFAULT_TTS_SETTINGS.localSpeechMode).volatile(),
  localVoiceURI: z.string().default(DEFAULT_TTS_SETTINGS.localVoiceURI).volatile(),
  voice: z.string().default(DEFAULT_TTS_SETTINGS.voice).volatile(),
  voiceDesignPrompt: z.string().min(1).default(DEFAULT_TTS_SETTINGS.voiceDesignPrompt).volatile(),
  voiceDesignCustomPrompt: z.string().default(DEFAULT_TTS_SETTINGS.voiceDesignCustomPrompt).volatile(),
  presetStylePrompt: z.string().default(DEFAULT_TTS_SETTINGS.presetStylePrompt).volatile(),
  format: z.union(TTS_FORMATS).default(DEFAULT_TTS_SETTINGS.format).volatile(),
  voiceDesignPlaybackMode: z.union(TTS_VOICE_DESIGN_PLAYBACK_MODES).default(DEFAULT_TTS_SETTINGS.voiceDesignPlaybackMode).volatile(),
  readScope: z.union(TTS_READ_SCOPES).default(DEFAULT_TTS_SETTINGS.readScope).volatile(),
  autoPlay: z.boolean().default(DEFAULT_TTS_SETTINGS.autoPlay).volatile(),
  instruction: z.string().default(DEFAULT_TTS_SETTINGS.instruction).volatile(),
  maxTextLength: z.number().step(1).min(1).default(DEFAULT_TTS_SETTINGS.maxTextLength).volatile(),
  requestTimeoutMs: z.number().step(1).min(1000).default(DEFAULT_TTS_SETTINGS.requestTimeoutMs).volatile(),
  maxMp3AudioBytes: z.number().step(1).min(1).default(DEFAULT_TTS_SETTINGS.maxMp3AudioBytes).volatile(),
  maxWavAudioBytes: z.number().step(1).min(1).default(DEFAULT_TTS_SETTINGS.maxWavAudioBytes).volatile(),
  maxPausedPcmBytes: z.number().step(1).min(1).default(DEFAULT_TTS_SETTINGS.maxPausedPcmBytes).volatile(),
  voiceVolume: z.number().min(0).max(1).default(DEFAULT_TTS_SETTINGS.voiceVolume).volatile(),
  voiceRate: z.number().step(0.1).min(0.5).max(2).default(DEFAULT_TTS_SETTINGS.voiceRate).volatile(),
  soundEnabled: z.boolean().default(DEFAULT_TTS_SETTINGS.soundEnabled).volatile(),
  soundVolume: z.number().min(0).max(1).default(DEFAULT_TTS_SETTINGS.soundVolume).volatile(),
  soundPack: z.union(SOUND_PACKS).default(DEFAULT_TTS_SETTINGS.soundPack).volatile(),
  taskSounds: z.boolean().default(DEFAULT_TTS_SETTINGS.taskSounds).volatile(),
  clickSounds: z.boolean().default(DEFAULT_TTS_SETTINGS.clickSounds).volatile(),
})

export type Config = ReturnType<typeof Config>
type ConfigValues = { [Key in keyof Config]: Config[Key] extends Volatile<infer Value> ? Value : Config[Key] }

function readConfig(config: Config): ConfigValues {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [key, (value as Volatile<unknown>).get()])) as ConfigValues
}

type CompleteAudioAbortReason = 'client-disconnect' | 'timeout' | null

async function latestTtsVersion(): Promise<string | null> {
  try {
    const response = await fetch(NPM_LATEST_URL, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return null
    const body = await response.json() as { version?: unknown }
    return typeof body.version === 'string' ? body.version : null
  } catch {
    return null
  }
}

/** Register the TTS settings and same-origin synthesis route. */
export function apply(ctx: Context, config: Config): void {
  const current = () => readConfig(config)

  // Load all assets
  const voicePresetAssets = new Map(TTS_VOICE_DESIGN_PRESETS.map((preset) => {
    const path = `${TTS_VOICE_DESIGN_ASSET_ROUTE}/${preset.id}.webp`
    const data = readFileSync(new URL(`../assets/voice-presets/${preset.id}.webp`, import.meta.url))
    return [path, data] as const
  }))
  const voiceAssets = new Map(TTS_VOICE_PRESETS.map((preset) => {
    const path = `${TTS_VOICE_ASSET_ROUTE}/${preset.id}.webp`
    const data = readFileSync(new URL(`../assets/voice-avatars/${preset.id}.webp`, import.meta.url))
    return [path, data] as const
  }))
  const toggleSoundAssets = new Map([...new Set([...Object.values(TTS_TOGGLE_SOUND_FILES).flat(), ...TTS_VOLUME_PREVIEW_FILES])].map((file) => {
    const path = `${TTS_TOGGLE_AUDIO_ASSET_ROUTE}/${file}`
    const data = readFileSync(new URL(`../assets/audio/${file}`, import.meta.url))
    return [path, data] as const
  }))

  const mimoLogoAsset = readFileSync(new URL('../assets/mimo.svg', import.meta.url))
  const toggleCharacterAsset = readFileSync(new URL('../assets/ui/toggle-characters.webp', import.meta.url))
  const soundEffectsCharacterAsset = readFileSync(new URL('../assets/ui/sound-effects-toggle-characters.webp', import.meta.url))
  const apiKeyWhaleAsset = readFileSync(new URL('../assets/ui/api-key-whale.webp', import.meta.url))
  const mixerWhaleAsset = readFileSync(new URL('../assets/ui/mixer-whale.webp', import.meta.url))
  const previewWhaleAsset = readFileSync(new URL('../assets/ui/preview-whale.webp', import.meta.url))
  const historyEmptyAsset = readFileSync(new URL('../assets/ui/history-empty-whale.webp', import.meta.url))
  const soundEffectsWhaleAsset = readFileSync(new URL('../assets/ui/sound-effects-whale.webp', import.meta.url))
  const soundEffectCuesAsset = readFileSync(new URL('../assets/ui/sound-effect-cues.webp', import.meta.url))

  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber), 'xiaomi-mimo-tts: custom settings page')
  })

  // Register all static assets using helper functions
  registerStaticAsset(ctx, {
    path: TTS_HISTORY_EMPTY_ASSET_ROUTE,
    data: historyEmptyAsset,
    contentType: 'image/webp',
    description: 'history empty illustration',
  })

  registerStaticAsset(ctx, {
    path: TTS_SOUND_EFFECTS_CHARACTER_ASSET_ROUTE,
    data: soundEffectsCharacterAsset,
    contentType: 'image/webp',
    description: 'sound effects character asset',
  })

  registerStaticAsset(ctx, {
    path: TTS_MIMO_LOGO_ASSET_ROUTE,
    data: mimoLogoAsset,
    contentType: 'image/svg+xml',
    description: 'MiMo logo asset',
  })

  registerStaticAsset(ctx, {
    path: TTS_TOGGLE_CHARACTER_ASSET_ROUTE,
    data: toggleCharacterAsset,
    contentType: 'image/png',
    description: 'character toggle asset',
  })

  registerStaticAsset(ctx, {
    path: TTS_API_KEY_WHALE_ASSET_ROUTE,
    data: apiKeyWhaleAsset,
    contentType: 'image/png',
    description: 'API key whale asset',
  })

  registerStaticAsset(ctx, {
    path: TTS_MIXER_WHALE_ASSET_ROUTE,
    data: mixerWhaleAsset,
    contentType: 'image/png',
    description: 'mixer whale asset',
  })

  registerStaticAsset(ctx, {
    path: TTS_PREVIEW_WHALE_ASSET_ROUTE,
    data: previewWhaleAsset,
    contentType: 'image/png',
    description: 'preview whale asset',
  })

  registerStaticAsset(ctx, {
    path: TTS_SOUND_EFFECTS_WHALE_ASSET_ROUTE,
    data: soundEffectsWhaleAsset,
    contentType: 'image/png',
    description: 'sound effects whale asset',
  })

  registerStaticAsset(ctx, {
    path: TTS_SOUND_EFFECT_CUES_ASSET_ROUTE,
    data: soundEffectCuesAsset,
    contentType: 'image/png',
    description: 'sound effect cue asset',
  })

  registerStaticAssetMap(ctx, {
    pathPrefix: TTS_TOGGLE_AUDIO_ASSET_ROUTE,
    assets: toggleSoundAssets,
    contentType: 'audio/mpeg',
    description: 'toggle sound assets',
  })

  registerStaticAssetMap(ctx, {
    pathPrefix: TTS_VOICE_DESIGN_ASSET_ROUTE,
    assets: voicePresetAssets,
    contentType: 'image/webp',
    description: 'voice preset assets',
  })

  registerStaticAssetMap(ctx, {
    pathPrefix: TTS_VOICE_ASSET_ROUTE,
    assets: voiceAssets,
    contentType: 'image/webp',
    description: 'built-in voice assets',
  })

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: TTS_UPDATE_ROUTE,
    async handler(req, res) {
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET')
        json(res, 405, { error: 'method-not-allowed' })
        return
      }
      const latest = await latestTtsVersion()
      json(res, 200, { currentVersion: TTS_VERSION, latestVersion: latest, updateAvailable: latest !== null && isNewerTtsVersion(latest, TTS_VERSION) })
    },
  }), 'xiaomi-mimo-tts: update status route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: TTS_API_KEY_STATUS_ROUTE,
    handler(req, res) {
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET')
        json(res, 405, { error: 'method-not-allowed' })
        return
      }

      const apiKey = current().apiKey.trim()
      json(res, 200, {
        configured: apiKey.length > 0,
        supported: apiKey.length > 0 && isSupportedTtsApiKey(apiKey),
      })
    },
  }), 'xiaomi-mimo-tts: API key status route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: TTS_ROUTE,
    async handler(req, res) {
      if (req.method !== 'POST') {
        res.setHeader('allow', 'POST')
        json(res, 405, { error: 'method-not-allowed' })
        return
      }

      let body: SynthesizeBody
      try {
        body = await readJsonBody(req) as SynthesizeBody
      } catch (error) {
        json(res, error instanceof Error && error.message === 'request-body-too-large' ? 413 : 400, {
          error: error instanceof Error && error.message === 'request-body-too-large'
            ? 'request-body-too-large'
            : 'invalid-json',
        })
        return
      }

      const text = typeof body.text === 'string' ? prepareTtsText(body.text) : ''
      const options = synthesisOptions(current(), body)

      if (text.length === 0) {
        json(res, 400, { error: 'text-required' })
        return
      }
      if (text.length > options.maxTextLength) {
        json(res, 413, {
          error: 'text-too-long',
          maxTextLength: options.maxTextLength,
        })
        return
      }
      if (options.apiKey.trim().length === 0) {
        json(res, 409, { error: 'api-key-not-configured' })
        return
      }

      const controller = new AbortController()
      let abortReason: CompleteAudioAbortReason = null
      const abort = (reason: Exclude<CompleteAudioAbortReason, null>): void => {
        if (controller.signal.aborted) return
        abortReason = reason
        controller.abort()
      }
      const timeout = setTimeout(() => abort('timeout'), options.requestTimeoutMs)
      const abortOnRequest = () => abort('client-disconnect')
      const abortOnResponseClose = () => {
        if (!res.writableEnded) abort('client-disconnect')
      }
      req.once('aborted', abortOnRequest)
      res.once('close', abortOnResponseClose)

      try {
        if (body.format !== undefined && body.format !== 'mp3' && body.format !== 'wav') {
          json(res, 400, { error: 'invalid-audio-format' })
          return
        }
        const format = body.format === 'mp3' || body.format === 'wav' ? body.format : completeAudioFormat(options)
        const endpoint = chatCompletionsEndpoint(options.apiKey, options.baseURL)
        const response = await fetch(endpoint, {
          method: 'POST',
          redirect: 'error',
          headers: {
            authorization: `Bearer ${options.apiKey.trim()}`,
            'content-type': 'application/json',
            accept: 'application/json',
            'user-agent': USER_AGENT,
          },
          body: JSON.stringify({
            model: upstreamModel(options),
            messages: requestMessages(options, text),
            audio: options.model === 'mimo-v2.5-tts-voicedesign'
              ? { format }
              : { format, voice: options.voice },
            stream: false,
          }),
          signal: controller.signal,
        })

        const audioLimit = completeAudioLimit(options, format)
        const parsed = await readLimitedXiaomiResponse(response, completeAudioJsonLimit(audioLimit), controller)

        if (!response.ok) {
          json(res, response.status, {
            error: 'xiaomi-api-error',
            message: apiErrorMessage(response.status, parsed),
          })
          return
        }

        const audioBase64 = parsed?.choices?.[0]?.message?.audio?.data
        if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
          json(res, 502, {
            error: 'invalid-xiaomi-response',
            message: 'Xiaomi MiMo response did not contain choices[0].message.audio.data',
          })
          return
        }

        const audio = decodeCompleteAudio(audioBase64, format, audioLimit)

        res.statusCode = 200
        res.setHeader('content-type', format === 'mp3' ? 'audio/mpeg' : 'audio/wav')
        res.setHeader('content-length', String(audio.byteLength))
        res.setHeader('cache-control', 'no-store')
        res.end(audio)
      } catch (error) {
        if (abortReason === 'client-disconnect' || res.destroyed || res.writableEnded) return
        if (error instanceof CompleteAudioResponseError) {
          json(res, 502, { error: error.code, message: error.message })
          return
        }
        json(res, abortReason === 'timeout' ? 504 : 502, {
          error: abortReason === 'timeout' ? 'xiaomi-timeout' : 'xiaomi-request-failed',
          message: error instanceof Error ? error.message : String(error),
        })
      } finally {
        clearTimeout(timeout)
        req.off('aborted', abortOnRequest)
        res.off('close', abortOnResponseClose)
      }
    },
  }), 'xiaomi-mimo-tts: synthesis route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: TTS_STREAM_ROUTE,
    async handler(req, res) {
      const requestId = nextHostStreamRequestId++
      debugConsole?.info(STREAM_HOST_LOG, `[请求 ${requestId}] 收到流式合成请求`, { method: req.method, path: TTS_STREAM_ROUTE })
      if (req.method !== 'POST') {
        debugConsole?.warn(STREAM_HOST_LOG, `[请求 ${requestId}] 拒绝：仅支持 POST`)
        res.setHeader('allow', 'POST')
        json(res, 405, { error: 'method-not-allowed' })
        return
      }

      let body: SynthesizeBody
      try {
        body = await readJsonBody(req) as SynthesizeBody
      } catch (error) {
        debugConsole?.error(STREAM_HOST_LOG, `[请求 ${requestId}] 请求体解析失败`, error)
        json(res, error instanceof Error && error.message === 'request-body-too-large' ? 413 : 400, {
          error: error instanceof Error && error.message === 'request-body-too-large'
            ? 'request-body-too-large'
            : 'invalid-json',
        })
        return
      }

      const text = typeof body.text === 'string' ? prepareTtsText(body.text) : ''
      const options = synthesisOptions(current(), body)
      debugConsole?.info(STREAM_HOST_LOG, `[请求 ${requestId}] 请求参数已解析`, {
        text,
        textLength: text.length,
        model: upstreamModel(options),
        voice: options.voice,
        apiKeyConfigured: options.apiKey.trim().length > 0,
        requestTimeoutMs: options.requestTimeoutMs,
      })
      if (text.length === 0) {
        debugConsole?.warn(STREAM_HOST_LOG, `[请求 ${requestId}] 拒绝：文本为空`)
        json(res, 400, { error: 'text-required' })
        return
      }
      if (text.length > options.maxTextLength) {
        debugConsole?.warn(STREAM_HOST_LOG, `[请求 ${requestId}] 拒绝：文本过长`, { textLength: text.length, maxTextLength: options.maxTextLength })
        json(res, 413, { error: 'text-too-long', maxTextLength: options.maxTextLength })
        return
      }
      if (options.apiKey.trim().length === 0) {
        debugConsole?.warn(STREAM_HOST_LOG, `[请求 ${requestId}] 拒绝：API Key 未配置`)
        json(res, 409, { error: 'api-key-not-configured' })
        return
      }
      if (upstreamModel(options) !== 'mimo-v2.5-tts') {
        debugConsole?.warn(STREAM_HOST_LOG, `[请求 ${requestId}] 拒绝：模型不支持 PCM 流式播放`, { model: upstreamModel(options) })
        json(res, 409, { error: 'streaming-model-unsupported', message: 'Realtime PCM streaming requires mimo-v2.5-tts.' })
        return
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), options.requestTimeoutMs)
      const abortOnDisconnect = () => controller.abort()
      req.once('aborted', abortOnDisconnect)
      res.once('close', abortOnDisconnect)

      try {
        debugConsole?.info(STREAM_HOST_LOG, `[请求 ${requestId}] 正在请求小米 MiMo 上游`)
        const endpoint = chatCompletionsEndpoint(options.apiKey, options.baseURL)
        const response = await fetch(endpoint, {
          method: 'POST',
          redirect: 'error',
          headers: {
            authorization: `Bearer ${options.apiKey.trim()}`,
            'content-type': 'application/json',
            accept: 'text/event-stream',
            'user-agent': USER_AGENT,
          },
          body: JSON.stringify({
            model: upstreamModel(options),
            messages: requestMessages(options, text),
            audio: { format: 'pcm16', voice: options.voice },
            stream: true,
          }),
          signal: controller.signal,
        })
        debugConsole?.info(STREAM_HOST_LOG, `[请求 ${requestId}] 收到小米上游响应`, { ok: response.ok, status: response.status, contentType: response.headers.get('content-type') })

        if (!response.ok) {
          let parsed: XiaomiAudioResponse | undefined
          try {
            parsed = await response.json() as XiaomiAudioResponse
          } catch {
            parsed = undefined
          }
          debugConsole?.error(STREAM_HOST_LOG, `[请求 ${requestId}] 小米上游返回错误`, { status: response.status, message: apiErrorMessage(response.status, parsed) })
          json(res, response.status, { error: 'xiaomi-api-error', message: apiErrorMessage(response.status, parsed) })
          return
        }
        if (response.body === null) {
          debugConsole?.error(STREAM_HOST_LOG, `[请求 ${requestId}] 小米上游响应没有 body`)
          json(res, 502, { error: 'invalid-xiaomi-response', message: 'Xiaomi MiMo streaming response had no body.' })
          return
        }

        res.statusCode = 200
        res.setHeader('content-type', response.headers.get('content-type') ?? 'text/event-stream; charset=utf-8')
        res.setHeader('cache-control', 'no-store')
        res.setHeader('x-accel-buffering', 'no')
        const reader = response.body.getReader()
        let forwardedChunks = 0
        let forwardedBytes = 0
        try {
          while (!res.destroyed) {
            const chunk = await reader.read()
            if (chunk.done) break
            forwardedChunks += 1
            forwardedBytes += chunk.value.byteLength
            debugConsole?.info(STREAM_HOST_LOG, `[请求 ${requestId}] 转发上游数据块 #${forwardedChunks}`, { bytes: chunk.value.byteLength })
            res.write(chunk.value)
          }
        } finally {
          reader.releaseLock()
          debugConsole?.info(STREAM_HOST_LOG, `[请求 ${requestId}] 上游流读取结束`, { responseDestroyed: res.destroyed, forwardedChunks, forwardedBytes })
        }
        if (!res.destroyed) {
          res.end()
          debugConsole?.info(STREAM_HOST_LOG, `[请求 ${requestId}] 已完成浏览器响应`)
        }
      } catch (error) {
        debugConsole?.error(STREAM_HOST_LOG, `[请求 ${requestId}] 流式代理失败`, { aborted: controller.signal.aborted, error })
        if (!res.destroyed) {
          const aborted = controller.signal.aborted
          json(res, aborted ? 504 : 502, {
            error: aborted ? 'xiaomi-timeout' : 'xiaomi-request-failed',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      } finally {
        clearTimeout(timeout)
        req.off('aborted', abortOnDisconnect)
        res.off('close', abortOnDisconnect)
        debugConsole?.info(STREAM_HOST_LOG, `[请求 ${requestId}] 请求清理完成`, { aborted: controller.signal.aborted, responseDestroyed: res.destroyed })
      }
    },
  }), 'xiaomi-mimo-tts: streaming synthesis route')
}
