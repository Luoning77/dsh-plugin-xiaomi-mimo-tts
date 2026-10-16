import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'

interface StaticAssetOptions {
  path: string
  data: Buffer
  contentType: string
  description: string
}

/** Create a handler for static asset serving with proper HTTP semantics. */
function createStaticAssetHandler(data: Buffer, contentType: string) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.setHeader('allow', 'GET, HEAD')
      res.end()
      return
    }

    res.statusCode = 200
    res.setHeader('content-type', contentType)
    res.setHeader('content-length', String(data.byteLength))
    res.setHeader('cache-control', 'public, max-age=31536000, immutable')
    res.setHeader('x-content-type-options', 'nosniff')
    res.end(req.method === 'HEAD' ? undefined : data)
  }
}

/** Register a single static asset route. */
export function registerStaticAsset(ctx: Context, options: StaticAssetOptions): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: options.path,
    handler: createStaticAssetHandler(options.data, options.contentType),
  }), `xiaomi-mimo-tts: ${options.description}`)
}

interface StaticAssetMapOptions {
  pathPrefix: string
  assets: Map<string, Buffer>
  contentType: string
  description: string
}

/** Register a prefix route that serves multiple assets from a map. */
export function registerStaticAssetMap(ctx: Context, options: StaticAssetMapOptions): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: options.pathPrefix,
    handler(req, res) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405
        res.setHeader('allow', 'GET, HEAD')
        res.end()
        return
      }

      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
      const asset = options.assets.get(pathname)
      if (asset === undefined) {
        res.statusCode = 404
        res.end()
        return
      }

      res.statusCode = 200
      res.setHeader('content-type', options.contentType)
      res.setHeader('content-length', String(asset.byteLength))
      res.setHeader('cache-control', 'public, max-age=31536000, immutable')
      res.setHeader('x-content-type-options', 'nosniff')
      res.end(req.method === 'HEAD' ? undefined : asset)
    },
  }), `xiaomi-mimo-tts: ${options.description}`)
}
