import { VoiceReadingSection } from '../../src/client/settings/voice-reading-section.js'
import type { Translate } from '../../src/client/localization.js'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { TtsSettings } from '../../src/shared.js'

/** Renders the independent Voice reading settings page inside the standalone preview. */
export function VoiceReadingPreview({ scope, t }: { scope: ConfigForm<TtsSettings>; t: Translate }) {
  const openPluginSettings = (): void => {
    const settings = document.querySelector<HTMLElement>('.preview-settings-list')
    settings?.scrollIntoView({ block: 'start' })
    settings?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
  }
  return <VoiceReadingSection scope={scope} t={t} openPluginSettings={openPluginSettings} close={() => {}} />
}
