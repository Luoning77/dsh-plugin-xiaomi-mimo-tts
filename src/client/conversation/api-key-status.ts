import { useEffect, useState } from 'react'
import { TTS_API_KEY_STATUS_ROUTE } from '../../shared.js'

let apiKeyStatusPromise: Promise<boolean> | null = null
let apiKeyStatusExpires = 0

export function useApiKeySupported(active: boolean): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    if (!active) { setSupported(null); return }
    if (apiKeyStatusPromise === null || apiKeyStatusExpires <= Date.now()) {
      apiKeyStatusExpires = Date.now() + 2000
      apiKeyStatusPromise = fetch(TTS_API_KEY_STATUS_ROUTE, { headers: { accept: 'application/json' } })
        .then(async (response) => {
          if (!response.ok) throw new Error('api-key-status-failed')
          const result = await response.json() as { supported?: unknown }
          return result.supported === true
        })
        .catch(() => false)
    }
    let mounted = true
    void apiKeyStatusPromise.then((value) => { if (mounted) setSupported(value) })
    return () => { mounted = false }
  }, [active])
  return supported
}
