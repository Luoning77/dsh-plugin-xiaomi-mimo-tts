import assert from 'node:assert/strict'
import test from 'node:test'
import { gzipSync } from 'node:zlib'
import { loadClientModule } from './helpers/client-modules.mjs'
import { serverFrame } from './helpers/doubao-server.mjs'

const { encodeDoubaoFrame, decodeDoubaoFrame } = await loadClientModule('src/host/doubao-protocol.ts')

test('Doubao connection and session requests match the documented binary protocol', () => {
  assert.equal(encodeDoubaoFrame(1).toString('hex'), '1114100000000001000000027b7d')
  assert.equal(encodeDoubaoFrame(102, {}, 'abc').toString('hex'), '111410000000006600000003616263000000027b7d')
  const request = encodeDoubaoFrame(200, { req_params: { text: '你好' } }, 'session')
  assert.equal(request.readUInt32BE(8), 7)
  assert.equal(JSON.parse(request.subarray(23).toString()).req_params.text, '你好')
})

test('Doubao frames distinguish connection IDs, session IDs and raw audio', () => {
  const connected = decodeDoubaoFrame(serverFrame(50))
  assert.equal(connected.connectId, 'test-connection')
  assert.equal(connected.sessionId, '')
  const audio = decodeDoubaoFrame(serverFrame(352, Buffer.from([1, 2, 3]), 'session', 11))
  assert.equal(audio.sessionId, 'session')
  assert.equal(audio.type, 11)
  assert.deepEqual(audio.payload, Buffer.from([1, 2, 3]))
})

test('Doubao decoder rejects truncated and oversized fields, unsupported headers and trailing bytes', () => {
  const valid = serverFrame(150, {}, 'session')
  for (let length = 0; length < valid.length; length++) assert.throws(() => decodeDoubaoFrame(valid.subarray(0, length)))
  assert.throws(() => decodeDoubaoFrame(Buffer.concat([valid, Buffer.from([0])])), /invalid-frame/)
  const oversized = Buffer.from(valid)
  oversized.writeUInt32BE(0xFFFFFFFF, 8)
  assert.throws(() => decodeDoubaoFrame(oversized), /invalid-frame/)
  for (const header of [[0, 0], [0, 0x21], [2, 0x13]]) {
    const frame = Buffer.from(valid)
    frame[header[0]] = header[1]
    assert.throws(() => decodeDoubaoFrame(frame), /invalid-frame/)
  }
})

test('Doubao decoder supports compressed payloads and explicit error frames', () => {
  const compressed = serverFrame(153, gzipSync(Buffer.from('{"message":"bad voice"}')), 'session')
  compressed[2] = 0x11
  assert.equal(JSON.parse(decodeDoubaoFrame(compressed).payload.toString()).message, 'bad voice')
  const payload = Buffer.from('denied')
  const error = Buffer.alloc(12 + payload.length)
  error.set([0x11, 0xf0, 0x10, 0])
  error.writeUInt32BE(45000001, 4)
  error.writeUInt32BE(payload.length, 8)
  payload.copy(error, 12)
  assert.equal(decodeDoubaoFrame(error).errorCode, 45000001)
})
