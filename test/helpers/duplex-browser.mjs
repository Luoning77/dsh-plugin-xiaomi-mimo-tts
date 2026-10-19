import { settle } from './client-modules.mjs'

export async function withDuplexBrowser(run, options = {}) {
  const original = globalThis.WebSocket
  const sockets = []
  class Socket {
    static OPEN = 1
    static CLOSED = 3
    readyState = 0
    binaryType = ''
    sent = []
    closed = false
    constructor(url) {
      this.url = String(url)
      sockets.push(this)
      queueMicrotask(() => { if (!this.closed) { this.readyState = 1; this.onopen?.({}) } })
    }
    message(value) { this.onmessage?.({ data: typeof value === 'object' ? JSON.stringify(value) : value }) }
    audio(values = [0, 0, 1, 0]) { this.onmessage?.({ data: Uint8Array.from(values).buffer }) }
    send(raw) {
      const command = JSON.parse(raw)
      this.sent.push(command)
      queueMicrotask(() => {
        if (this.closed) return
        if (options.handle?.(this, command) === true) return
        if (command.type === 'start') this.message({ type: 'ready', sampleFormat: 's16le', sampleRate: 24000, channels: 1 })
        if (command.type === 'text') this.audio()
        if (command.type === 'finish') this.message({ type: 'done' })
      })
    }
    close() { this.closed = true; this.readyState = 3; queueMicrotask(() => this.onclose?.({})) }
    drop() { this.readyState = 3; this.onclose?.({}) }
  }
  globalThis.WebSocket = Socket
  try { await run(sockets) } finally { for (const socket of sockets) socket.close(); globalThis.WebSocket = original; await settle() }
}
