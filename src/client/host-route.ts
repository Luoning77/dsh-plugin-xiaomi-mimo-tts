export function hostRoute(path: string): string {
  const relative = path.replace(/^\/+/, '')
  return typeof document === 'undefined' ? `/${relative}` : new URL(relative, document.baseURI).pathname
}

/** Desktop streams connect directly to the shell-owned Host, as DSH's gateway does. */
export function hostWebSocketUrl(path: string): string {
  const transport = (globalThis as { __DSH_TRANSPORT__?: { streamBaseUrl?: string } }).__DSH_TRANSPORT__
  const base = transport?.streamBaseUrl ?? (typeof document === 'undefined' ? globalThis.location?.href ?? 'http://localhost/' : document.baseURI)
  const url = new URL(path.replace(/^\/+/, ''), base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}
