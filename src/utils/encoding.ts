/** Return the exact decoded size of canonical padded Base64, or null when invalid. */
export function strictBase64DecodedLength(value: string): number | null {
  if (value.length === 0 || value.length % 4 !== 0) return null
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) return null
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return (value.length / 4) * 3 - padding
}

/** Parse complete SSE records while retaining the final partial record for the next network chunk. */
export function parseSseRecords(value: string): { events: string[]; remainder: string } {
  const records = value.split(/\r?\n\r?\n/u)
  const remainder = records.pop() ?? ''
  const events = records
    .map((record) => record.split(/\r?\n/u)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n'))
    .filter((record) => record.length > 0)
  return { events, remainder }
}

/** Resolve an optional settings snapshot into normalized values. */
export function normalizeVoiceRate(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.max(0.5, Math.min(2, value)) * 10) / 10 : 1
}
