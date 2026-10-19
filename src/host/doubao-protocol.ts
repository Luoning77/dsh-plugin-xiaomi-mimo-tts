import { gunzipSync } from 'node:zlib'

export const DoubaoEvent = {
  StartConnection: 1, FinishConnection: 2,
  ConnectionStarted: 50, ConnectionFailed: 51, ConnectionFinished: 52,
  StartSession: 100, CancelSession: 101, FinishSession: 102,
  SessionStarted: 150, SessionCanceled: 151, SessionFinished: 152, SessionFailed: 153,
  TaskRequest: 200, TTSSentenceStart: 350, TTSSentenceEnd: 351, TTSResponse: 352, TTSSubtitle: 364,
} as const

const CONNECTION_EVENTS = new Set<number>([1, 2, 50, 51, 52])
const CONNECTION_RESPONSES = new Set<number>([50, 51, 52])
const MAX_FRAME_BYTES = 16 * 1024 * 1024

export interface DoubaoFrame {
  type: number
  event: number
  sessionId: string
  connectId: string
  errorCode?: number
  payload: Buffer
}

/** V1, full client request, with event, JSON, no compression. Lengths are big-endian. */
export function encodeDoubaoFrame(event: number, payload: unknown = {}, sessionId = ''): Buffer {
  const data = Buffer.from(JSON.stringify(payload))
  const id = Buffer.from(sessionId)
  const session = !CONNECTION_EVENTS.has(event)
  const frame = Buffer.alloc(4 + 4 + (session ? 4 + id.length : 0) + 4 + data.length)
  frame.set([0x11, 0x14, 0x10, 0])
  frame.writeInt32BE(event, 4)
  let offset = 8
  if (session) {
    frame.writeUInt32BE(id.length, offset)
    offset += 4
    id.copy(frame, offset)
    offset += id.length
  }
  frame.writeUInt32BE(data.length, offset)
  data.copy(frame, offset + 4)
  return frame
}

export function decodeDoubaoFrame(data: Uint8Array): DoubaoFrame {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  const invalid = () => new Error('doubao-invalid-frame')
  if (bytes.length < 4 || bytes.length > MAX_FRAME_BYTES || bytes[0]! >> 4 !== 1) throw invalid()
  let offset = (bytes[0]! & 15) * 4
  if (offset < 4 || offset > bytes.length) throw invalid()
  const type = bytes[1]! >> 4
  const flags = bytes[1]! & 15
  const compression = bytes[2]! & 15
  const serialization = bytes[2]! >> 4
  if (![1, 9, 11, 15].includes(type) || compression > 1 || serialization > 1) throw invalid()
  const integer = (signed = false): number => {
    if (offset + 4 > bytes.length) throw invalid()
    const value = signed ? bytes.readInt32BE(offset) : bytes.readUInt32BE(offset)
    offset += 4
    return value
  }
  const field = (): Buffer => {
    const length = integer()
    if (length > MAX_FRAME_BYTES || offset + length > bytes.length) throw invalid()
    const result = bytes.subarray(offset, offset + length)
    offset += length
    return result
  }
  let errorCode: number | undefined
  if (type === 15) errorCode = integer()
  else if ((flags & 3) === 1 || (flags & 3) === 3) integer(true)
  const event = flags & 4 ? integer(true) : 0
  const sessionId = flags & 4 && !CONNECTION_EVENTS.has(event) ? field().toString('utf8') : ''
  const connectId = CONNECTION_RESPONSES.has(event) ? field().toString('utf8') : ''
  let payload = field()
  if (offset !== bytes.length) throw invalid()
  if (compression === 1) payload = gunzipSync(payload, { maxOutputLength: MAX_FRAME_BYTES })
  return { type, event, sessionId, connectId, ...(errorCode === undefined ? {} : { errorCode }), payload }
}
