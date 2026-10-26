import { useEffect, useState } from 'react'
import { TTS_UPDATE_ROUTE } from '../../shared.js'
import { hostRoute } from '../host-route.js'

/**
 * Latest published version when the Host reports a newer release, else null.
 * Kept as a hook so the version check stays out of the settings component body.
 */
export function useAvailableUpdate(): string | null {
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void fetch(hostRoute(TTS_UPDATE_ROUTE), { cache: 'no-store', headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('version-check-failed')
        return await response.json() as { latestVersion?: unknown; updateAvailable?: unknown }
      })
      .then((result) => {
        if (!active) return
        setLatestVersion(result.updateAvailable === true && typeof result.latestVersion === 'string' ? result.latestVersion : null)
      })
      .catch(() => { if (active) setLatestVersion(null) })
    return () => { active = false }
  }, [])
  return latestVersion
}
