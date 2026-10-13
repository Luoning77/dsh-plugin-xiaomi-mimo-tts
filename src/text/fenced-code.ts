export interface FencedCodeRegions {
  regions: Array<[number, number]>
  pendingStart: number | null
}

/** Preserve raw Markdown boundaries until both complete and unfinished code have been excluded. */
export function findFencedCodeRegions(value: string): FencedCodeRegions {
  const regions: Array<[number, number]> = []
  const fence = /(^|\n)[ \t]{0,3}(`{3,}|~{3,})([^\r\n]*)/g
  let open: { start: number; marker: string } | null = null
  for (const match of value.matchAll(fence)) {
    const marker = match[2]!
    const suffix = match[3]!
    if (open === null) {
      if (marker[0] === '`' && suffix.includes('`')) continue
      open = { start: match.index + (match[1] === '\n' ? 1 : 0), marker }
    } else if (open.marker[0] === marker[0] && marker.length >= open.marker.length && suffix.trim().length === 0) {
      regions.push([open.start, match.index + match[0].length])
      open = null
    }
  }
  return { regions, pendingStart: open?.start ?? null }
}

export function removeFencedCode(value: string): string {
  const { regions, pendingStart } = findFencedCodeRegions(value)
  let text = ''
  let start = 0
  for (const [from, to] of regions) {
    text += `${value.slice(start, from)} `
    start = to
  }
  return text + value.slice(start, pendingStart ?? value.length)
}
