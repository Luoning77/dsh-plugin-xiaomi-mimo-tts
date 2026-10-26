import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadClientModule } from './helpers/client-modules.mjs'

const { SOURCE_URL, RELEASES_URL } = await loadClientModule('src/client/settings/plugin-links.ts')
const { TTS_QQ_GROUP_ASSET_ROUTE } = await import('../lib/shared.js')

test('settings link to the project and its releases on the same repository', () => {
  const source = new URL(SOURCE_URL)
  const releases = new URL(RELEASES_URL)
  assert.equal(source.protocol, 'https:')
  assert.equal(source.hostname, 'github.com')
  assert.equal(source.pathname, '/ppy-web/dsh-plugin-xiaomi-mimo-tts')
  assert.equal(releases.origin, source.origin)
  assert.equal(releases.pathname, `${source.pathname}/releases`)
})

test('the QQ invite route serves a shipped WebP asset in the host and preview', async () => {
  const filename = TTS_QQ_GROUP_ASSET_ROUTE.split('/').at(-1)
  const asset = await readFile(new URL(`../assets/ui/${filename}`, import.meta.url))
  assert.equal(asset.toString('ascii', 0, 4), 'RIFF')
  assert.equal(asset.toString('ascii', 8, 12), 'WEBP')
  const host = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8')
  const preview = await readFile(new URL('../tools/preview/vite.config.ts', import.meta.url), 'utf8')
  assert.match(host, /path: TTS_QQ_GROUP_ASSET_ROUTE/)
  assert.ok(host.includes(`../assets/ui/${filename}`))
  assert.ok(preview.includes(`['${filename}', path.join(repositoryRoot, 'assets', 'ui', '${filename}')]`))
})
