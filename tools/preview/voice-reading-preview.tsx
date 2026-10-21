import { VoiceReadingSection } from '../../src/client/settings/voice-reading-section.js'
import type { Translate } from '../../src/client/localization.js'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { TtsSettings } from '../../src/shared.js'

/** Renders the independent Voice reading settings page inside the standalone preview. */
export function VoiceReadingPreview({ scope, t }: { scope: ConfigForm<TtsSettings>; t: Translate }) {
  return <VoiceReadingSection scope={scope} t={t} close={() => {}} />
}
