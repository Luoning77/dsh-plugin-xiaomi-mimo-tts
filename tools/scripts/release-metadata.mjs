import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function releaseMetadata({ name, version, publishConfig }, tag) {
  if (tag !== `v${version}`) {
    throw new Error(`Tag ${tag} must match package version v${version}`)
  }
  const prerelease = version.split('+')[0].includes('-')
  const npmTag = publishConfig?.tag ?? (prerelease ? 'next' : 'latest')
  if (!['next', 'latest'].includes(npmTag)) {
    throw new Error(`Unsupported npm release channel: ${npmTag}`)
  }
  if (prerelease && npmTag !== 'next') {
    throw new Error('Prerelease versions must use the next channel')
  }
  return { name, version, npmTag }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
  const { name, version, npmTag } = releaseMetadata(manifest, process.env.RELEASE_TAG)
  appendFileSync(process.env.GITHUB_OUTPUT, `package_name=${name}\nversion=${version}\nnpm_tag=${npmTag}\n`)
  console.log(`${name}@${version} -> ${npmTag}`)
}
