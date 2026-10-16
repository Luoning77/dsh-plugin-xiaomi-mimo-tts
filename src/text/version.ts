const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

/** Return true only when `candidate` is a strictly newer semantic version. */
export function isNewerTtsVersion(candidate: string, current: string): boolean {
  const left = SEMVER.exec(candidate.trim())
  const right = SEMVER.exec(current.trim())
  if (left === null || right === null) return false
  for (let index = 1; index <= 3; index++) {
    const difference = Number(left[index]) - Number(right[index])
    if (difference !== 0) return difference > 0
  }
  const leftPre = left[4]?.split('.') ?? []
  const rightPre = right[4]?.split('.') ?? []
  if (leftPre.length === 0 || rightPre.length === 0) return leftPre.length === 0 && rightPre.length > 0
  for (let index = 0; index < Math.max(leftPre.length, rightPre.length); index++) {
    const a = leftPre[index]
    const b = rightPre[index]
    if (a === undefined) return false
    if (b === undefined) return true
    if (a === b) continue
    const aNumber = /^\d+$/u.test(a)
    const bNumber = /^\d+$/u.test(b)
    if (aNumber && bNumber) return Number(a) > Number(b)
    if (aNumber !== bNumber) return !aNumber
    return a > b
  }
  return false
}
