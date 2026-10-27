import { once } from 'node:events'
import WebSocket, { WebSocketServer } from 'ws'

/** Independent server-side framing, matching the documented on-wire layout. */
export function serverFrame(event, payload = {}, sessionId = '', type = 9) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload))
  const connection = [50, 51, 52].includes(event)
  const id = Buffer.from(connection ? 'test-connection' : sessionId)
  const bytes = Buffer.alloc(4 + 4 + 4 + id.length + 4 + data.length)
  bytes.set([0x11, (type << 4) | 4, type === 11 ? 0 : 0x10, 0])
  bytes.writeInt32BE(event, 4)
  bytes.writeUInt32BE(id.length, 8)
  id.copy(bytes, 12)
  bytes.writeUInt32BE(data.length, 12 + id.length)
  data.copy(bytes, 16 + id.length)
  return bytes
}

export function clientFrame(bytes) {
  const event = bytes.readInt32BE(4)
  let offset = 8
  let sessionId = ''
  if (event >= 100) {
    const length = bytes.readUInt32BE(offset)
    offset += 4
    sessionId = bytes.toString('utf8', offset, offset + length)
    offset += length
  }
  const size = bytes.readUInt32BE(offset)
  offset += 4
  return { event, sessionId, payload: JSON.parse(bytes.toString('utf8', offset, offset + size)) }
}

export async function withDoubaoServer(run, handle, verifyClient) {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1', ...(verifyClient ? { verifyClient } : {}) })
  await once(server, 'listening')
  const frames = []
  const headers = []
  const url = `ws://127.0.0.1:${server.address().port}`
  server.on('connection', (ws, request) => {
    headers.push(request.headers)
    ws.on('message', data => {
      const frame = clientFrame(data)
      frames.push(frame)
      if (handle?.(ws, frame, frames) === true) return
      const send = (event, payload = {}, type = 9) => ws.send(serverFrame(event, payload, frame.sessionId, type))
      if (frame.event === 1) send(50)
      if (frame.event === 100) send(150)
      if (frame.event === 200) { send(352, Buffer.from([0, 0, 1, 0]), 11); send(351) }
      if (frame.event === 102) send(152, { status_code: 20000000 })
      if (frame.event === 101) send(151)
      if (frame.event === 2) send(52)
    })
  })
  try { await run({ url, frames, headers, connect: values => new WebSocket(url, { headers: values }) }) } finally {
    for (const ws of server.clients) ws.terminate()
    await new Promise(resolve => server.close(resolve))
  }
}
