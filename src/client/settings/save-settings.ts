import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import { isSupportedTtsApiKey } from '../../types/settings.js'
import type { TtsSettings } from '../../types/settings.js'
import { resolveTtsSettings } from '../../utils/settings.js'
import type { DraftChanges, SettingsValues, EditableSettingField } from './types.js'

export const EDITABLE_SETTING_FIELDS: readonly EditableSettingField[] = ['announcementSources', 'provider', 'doubaoModel', 'doubaoVoice', 'doubaoClonedVoice', 'doubaoInstruction', 'instruction', 'enabled', 'autoPlay', 'voiceVolume', 'voiceRate', 'readScope', 'model', 'localSpeechMode', 'localVoiceURI', 'voice', 'voiceDesignPrompt', 'voiceDesignCustomPrompt', 'soundEnabled', 'soundVolume', 'soundPack', 'taskSounds', 'clickSounds']

export function validateSettingsDraft(draft: SettingsValues): string | null {
  return draft.provider === 'doubao' && !(draft.doubaoModel === 'seed-icl-2.0' ? draft.doubaoClonedVoice : draft.doubaoVoice).trim()
    ? 'voice-required' : null
}

/** Commit the draft atomically so credentials and provider selection change together. */
export async function saveSettingsDraft(scope: ConfigForm<TtsSettings>, draft: SettingsValues, changes: DraftChanges, keys: { xiaomi: string; doubao: string }): Promise<void> {
  const invalid = validateSettingsDraft(draft)
  if (invalid) throw new Error(invalid)
  for (const [provider, field] of [['xiaomi', 'apiKey'], ['doubao', 'doubaoApiKey']] as const) {
    if (changes[field]?.kind === 'set' && keys[provider].trim() && !isSupportedTtsApiKey(keys[provider], provider)) throw new Error('api-key-rejected')
  }
  const snapshot = scope.getSnapshot()
  const acceptedValues = resolveTtsSettings(snapshot.value)
  const overridden = (field: string) => snapshot.user !== null && typeof snapshot.user === 'object' && Object.hasOwn(snapshot.user, field)
  const ops: Parameters<ConfigForm<TtsSettings>['mutate']>[0][number][] = []
  const write = (field: string, value: unknown): void => {
    const change = changes[field as keyof DraftChanges]
    if (!change) return
    if (change.kind === 'set' && (field === 'apiKey' || field === 'doubaoApiKey') && !String(value).trim()) return
    if (change.kind === 'set' && field !== 'apiKey' && field !== 'doubaoApiKey' && (field === 'announcementSources' ? JSON.stringify(acceptedValues.announcementSources) === JSON.stringify(value) : Object.is(acceptedValues[field as keyof typeof acceptedValues], value))) return
    if (change.kind === 'clear' && !overridden(field)) return
    ops.push(change.kind === 'clear' ? { op: 'unset', path: [field] } : { op: 'set', path: [field], value })
  }
  for (const field of EDITABLE_SETTING_FIELDS) {
    if (field !== 'provider') write(field, draft[field])
  }
  write('apiKey', keys.xiaomi.trim())
  write('doubaoApiKey', keys.doubao.trim())
  write('provider', draft.provider)
  if (ops.length && !await scope.mutate(ops)) throw new Error('Host rejected a settings update')
}
