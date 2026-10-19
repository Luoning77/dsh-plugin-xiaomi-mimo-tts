import assert from 'node:assert/strict'
import test from 'node:test'
import { streamPcmAudio } from '../lib/pcm-stream.js'
import { loadClientModule } from './helpers/client-modules.mjs'

const { prefetchSegmentAudio } = await loadClientModule('src/client/playback/segmented-audio.ts')

test('audio requests preserve the browser deployment prefix and work without a document', async () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const originalFetch = globalThis.fetch
  try {
    for (const [baseURI, prefix] of [
      [undefined, ''],
      ['https://example.test/', ''],
      ['https://example.test/dsh/', '/dsh'],
      ['https://example.test/tools/dsh/', '/tools/dsh'],
    ]) {
      if (baseURI === undefined) delete globalThis.document
      else Object.defineProperty(globalThis, 'document', { configurable: true, value: { baseURI } })
      const requests = []
      globalThis.fetch = async (url, init) => {
        requests.push({ url, body: JSON.parse(init.body) })
        if (url.endsWith('/synthesize-stream')) {
          return new Response(`data: ${JSON.stringify({ choices: [{ delta: { audio: { data: 'AAA=' } } }] })}\n\ndata: [DONE]\n\n`)
        }
        return new Response('wav bytes')
      }
      const signal = new AbortController().signal
      const audio = await prefetchSegmentAudio('欢迎回来', signal)
      assert.equal(audio.ok, true)
      assert.equal(await audio.blob.text(), 'wav bytes')
      const chunks = []
      await streamPcmAudio('欢迎回来', signal, chunk => { chunks.push(chunk) })
      assert.deepEqual(chunks, ['AAA='])
      assert.deepEqual(requests.map(request => request.url), [
        `${prefix}/plugins/xiaomi-mimo-tts/synthesize`,
        `${prefix}/plugins/xiaomi-mimo-tts/synthesize-stream`,
      ])
      for (const request of requests) assert.equal(request.body.text, '欢迎回来')
      assert.equal(requests[0].body.format, 'wav')
    }
  } finally {
    globalThis.fetch = originalFetch
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else delete globalThis.document
  }
})
