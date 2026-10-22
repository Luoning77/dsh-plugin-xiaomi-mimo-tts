import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const section = await readFile(new URL('../src/client/settings/voice-reading-section.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/client/style/voice-reading.css', import.meta.url), 'utf8')

test('voice reading page builds its dropdowns from the Host capsule selector + Menu primitive', () => {
  // Same primitive pair the Host settings rows use
  // (PreferenceRow.tsx / LanguageRow.tsx): Menu with a chevron pill anchor.
  assert.match(
    section,
    /import \{ IconChevronDownOutlineRegular, Menu, Switch \} from '@deepseek-ai\/dsh-client-ui-primitives'/,
  )
  assert.match(section, /function VoiceReadingSelect\(/)
  assert.match(section, /<Menu\s[\s\S]*?anchor=\{selector\}[\s\S]*?align="end"[\s\S]*?portal/)
  assert.match(section, /aria-haspopup="menu"/)
  assert.match(section, /aria-expanded=\{open\}/)
  // Choosing returns focus to the pill before publishing, like the Host rows.
  assert.match(section, /selectorRef\.current\?\.focus\(\{ preventScroll: true \}\)/)
})

test('both voice and read scope rows use the shared capsule selector', () => {
  assert.equal((section.match(/<VoiceReadingSelect/g) ?? []).length, 4)
  assert.match(section, /label=\{t\('settings\.voiceReadingVoice'\)\}/)
  assert.match(section, /label=\{t\('settings\.voiceReadingVolume'\)\}/)
  assert.match(section, /label=\{t\('settings\.voiceReadingRate'\)\}/)
  assert.match(section, /label=\{t\('settings\.readScope'\)\}/)
  // The old native <select> markup is gone.
  assert.doesNotMatch(section, /<select/)
  assert.doesNotMatch(css, /\.xmimo-voice-reading-select\b(?!or)/)
})

test('capsule selector styles match the Host pill (36px, borderless, module surface)', () => {
  const rule = /\.xmimo-voice-reading-selector \{([^}]*)\}/.exec(css)
  assert.ok(rule, 'missing .xmimo-voice-reading-selector rule')
  const body = rule[1]
  assert.match(body, /display:\s*inline-flex;/)
  assert.match(body, /align-items:\s*center;/)
  assert.match(body, /gap:\s*12px;/)
  assert.match(body, /height:\s*36px;/)
  assert.match(body, /padding:\s*0 14px;/)
  assert.match(body, /border:\s*none;/)
  assert.match(body, /border-radius:\s*var\(--dsw-radius-md, 12px\);/)
  assert.match(body, /background:\s*var\(--dsw-alias-bg-module-platform, #eef0f3\);/)
  assert.match(body, /cursor:\s*pointer;/)

  assert.match(
    css,
    /\.xmimo-voice-reading-selector:hover:not\(:disabled\) \{([^}]*)\}/,
  )
  assert.match(css, /\.xmimo-voice-reading-selector:hover:not\(:disabled\) \{[^}]*interactive-bg-hover/)
  assert.match(css, /\.xmimo-voice-reading-selector:disabled \{[^}]*cursor:\s*default;/)
})

test('page heading and card chrome match the requested layout', () => {
  const title = /\.xmimo-voice-reading-title \{([^}]*)\}/.exec(css)
  assert.ok(title, 'missing .xmimo-voice-reading-title rule')
  assert.match(title[1], /font-size:\s*18px;/)
  assert.match(title[1], /font-weight:\s*600;/)
  // The rows draw their own hairlines; the card itself must stay chrome-free.
  const card = /\.xmimo-voice-reading-card \{([^}]*)\}/.exec(css)
  assert.ok(card, 'missing .xmimo-voice-reading-card rule')
  assert.match(card[1], /border:\s*0;/)
  assert.match(card[1], /border-radius:\s*0;/)
  assert.match(card[1], /padding:\s*0;/)
  assert.doesNotMatch(card[1], /background:/)
})
