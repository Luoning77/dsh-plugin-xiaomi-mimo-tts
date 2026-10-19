import type { CSSProperties, ReactElement } from 'react'
import { useId, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TtsProvider } from '../../types/providers.js'
import { TTS_API_KEY_WHALE_ASSET_ROUTE, TTS_MIMO_LOGO_ASSET_ROUTE } from '../../shared.js'
import type { Translate } from '../localization.js'
import { hostRoute } from '../host-route.js'
import { SettingFieldHeading } from './field-heading.js'
import { ModuleShell } from './module-shell.js'

const API_KEY_IDLE_COPY_KEYS = [
  'settings.apiKeyIdleCopy1',
  'settings.apiKeyIdleCopy2',
  'settings.apiKeyIdleCopy3',
  'settings.apiKeyIdleCopy4',
] as const

const API_KEY_FOCUS_COPY_KEYS = [
  'settings.apiKeyFocusCopy1',
  'settings.apiKeyFocusCopy2',
  'settings.apiKeyFocusCopy3',
  'settings.apiKeyFocusCopy4',
] as const

type ApiKeyBubbleKey = typeof API_KEY_IDLE_COPY_KEYS[number] | typeof API_KEY_FOCUS_COPY_KEYS[number]

function randomCopyKey<T extends readonly string[]>(keys: T, current?: string): T[number] {
  if (keys.length < 2) return keys[0]!
  let next = keys[Math.floor(Math.random() * keys.length)]!
  while (next === current) next = keys[Math.floor(Math.random() * keys.length)]!
  return next
}

export interface ApiKeyModuleProps {
  provider: TtsProvider
  onProviderChange: (provider: TtsProvider) => void
  t: Translate
  value: string
  message: string
  invalid: boolean
  clearable: boolean
  writable: boolean
  minimal: boolean
  onChange: (value: string) => void
  onClear: () => void
}

export function ApiKeyModule({ t, provider, onProviderChange, value, message, invalid, clearable, writable, minimal, onChange, onClear }: ApiKeyModuleProps): ReactElement {
  const [bubbleKey, setBubbleKey] = useState<ApiKeyBubbleKey>(() => randomCopyKey(API_KEY_IDLE_COPY_KEYS))
  const inputId = useId()
  const messageId = useId()
  const keyUrl = provider === 'doubao' ? 'https://console.volcengine.com/speech/new/setting/apikeys?projectName=default' : 'https://platform.xiaomimimo.com/console/api-keys'
  const nextProvider = provider === 'xiaomi' ? 'doubao' : 'xiaomi'
  const providerLabel = t(provider === 'xiaomi' ? 'settings.providerXiaomi' : 'settings.providerDoubao')
  const nextProviderLabel = t(nextProvider === 'xiaomi' ? 'settings.providerXiaomi' : 'settings.providerDoubao')
  const switchLabel = `${t('settings.provider')}: ${providerLabel} · ${t('settings.switchProvider')}: ${nextProviderLabel}`
  const providerSwitch = <Button
    type="button"
    variant="ghost"
    size="sm"
    className="xmimo-tts-provider-cycle"
    aria-label={switchLabel}
    title={switchLabel}
    disabled={!writable}
    onClick={() => onProviderChange(nextProvider)}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4" />
    </svg>
  </Button>

  return <ModuleShell className="xmimo-tts-settings-module xmimo-tts-api-key xmimo-ui-module-padded" title={minimal ? t('settings.apiKey') : <SettingFieldHeading
      label={provider === 'doubao' ? t('settings.providerDoubao') : minimal ? t('settings.apiKey') : <span
        className="xmimo-tts-api-key-logo"
        role="img"
        aria-label={t('settings.apiKey')}
        style={{ '--xmimo-tts-api-key-logo-image': `url(${hostRoute(TTS_MIMO_LOGO_ASSET_ROUTE)})` } as CSSProperties}
      />}
      suffix={<>
        {providerSwitch}
        <a className="xmimo-tts-api-key-link" href={keyUrl} target="_blank" rel="noopener noreferrer">{t('settings.getApiKey')}</a>
        {clearable ? <Button type="button" variant="ghost" size="sm" className="xmimo-tts-reset" disabled={!writable} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClear() }}>{t('settings.apiKeyClear')}</Button> : null}
      </>}
      disabled={!writable}
      resettable={false}
    />} action={minimal ? undefined : <span className="xmimo-tts-api-key-decoration" aria-hidden="true" />}>
    <div className="xmimo-tts-api-key-content">
      <div className="xmimo-tts-api-key-input">
      {!minimal ? <span className="xmimo-tts-character-bubble xmimo-tts-api-key-bubble" aria-hidden="true">{t(bubbleKey)}</span> : null}
      {!minimal ? <span
        className="xmimo-tts-api-key-whale"
        style={{ backgroundImage: `url(${hostRoute(TTS_API_KEY_WHALE_ASSET_ROUTE)})` }}
        aria-hidden="true"
      /> : null}
      <input
          id={inputId}
          type="password"
          value={value}
          name="xmimo-tts-api-key"
          autoComplete="new-password"
          autoCorrect="off"
          spellCheck={false}
          aria-label={t('settings.apiKey')}
          aria-autocomplete="none"
          aria-describedby={messageId}
          aria-invalid={invalid}
          data-1p-ignore="true"
          data-bwignore="true"
          data-lpignore="true"
          placeholder={t('settings.secretPlaceholder')}
          disabled={!writable}
          onFocus={() => { setBubbleKey((current) => randomCopyKey(API_KEY_FOCUS_COPY_KEYS, current)) }}
          onBlur={() => { setBubbleKey((current) => randomCopyKey(API_KEY_IDLE_COPY_KEYS, current)) }}
          onChange={(event) => { onChange(event.target.value) }}
          style={{ padding: '0 var(--xmimo-ui-space-4)' }}
      />
      {minimal ? <span className="xmimo-tts-api-key-inline-actions">
        {providerSwitch}
        <a className="xmimo-tts-api-key-link" href={keyUrl} target="_blank" rel="noopener noreferrer">{t('settings.getApiKey')}</a>
        {clearable ? <Button type="button" variant="ghost" size="sm" className="xmimo-tts-reset" disabled={!writable} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClear() }}>{t('settings.apiKeyClear')}</Button> : null}
      </span> : null}
      </div>
      <small
        id={messageId}
        className={`xmimo-tts-api-key-message${invalid ? ' xmimo-tts-api-key-warning' : ''}${minimal && !invalid ? ' xmimo-tts-visually-hidden' : ''}`}
        role={invalid ? 'alert' : 'status'}
      >
        {message}
      </small>
    </div>
  </ModuleShell>
}
