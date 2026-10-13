import { extractMarkdownPlainText } from '@deepseek-ai/dsh-client-ui-primitives'
import { prepareTtsText } from '../../shared.js'

/** Exclude raw code before Markdown extraction can erase its fences. */
export function prepareSpeechText(value: string): string {
  return extractMarkdownPlainText(prepareTtsText(value)).trim()
}
