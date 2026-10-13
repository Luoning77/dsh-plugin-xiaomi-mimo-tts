import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyTtsLivePlaybackScope,
  applyTtsPlaybackScope,
  DEFAULT_TTS_SEGMENT_CHARACTERS,
  firstTtsSegment,
  firstTtsSegments,
  MAX_TTS_SEGMENT_CHARACTERS,
  prepareTtsText,
  splitTtsSegments,
  TtsFirstSegmentLimiter,
  TTS_SMART_TRUNCATION_OUTROS,
} from '../lib/shared.js'

test('keeps long sentences whole across synthesis chunks and opening playback', () => {
  const sentences = [
    `${'甲'.repeat(MAX_TTS_SEGMENT_CHARACTERS + 60)}。`,
    `${'乙'.repeat(100)}，${'丙'.repeat(180)}。`,
    '最后一句。',
  ].map(prepareTtsText)
  const text = sentences.join('')
  assert.deepEqual(splitTtsSegments(text), sentences)
  assert.equal(firstTtsSegment(text), sentences[0])
  assert.equal(applyTtsPlaybackScope(text, 'first-segment', true), sentences[0])
})

test('Smart playback includes two opening segments before adding a closing cue', () => {
  const first = `${'甲'.repeat(MAX_TTS_SEGMENT_CHARACTERS + 60)}。`
  const text = prepareTtsText(first + `${'乙'.repeat(600)}。`)
  const result = applyTtsPlaybackScope(text, 'smart', true, () => 0)
  assert.equal(result, firstTtsSegments(text, 2))
})

test('adds the Smart closing cue when resumed live playback reaches completion', () => {
  const limiter = new TtsFirstSegmentLimiter()
  const first = `${'甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS)}。`
  const partial = prepareTtsText(first + `${'乙'.repeat(40)}`)
  const final = prepareTtsText(first + `${'乙'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS)}。`)

  const checkpoint = applyTtsLivePlaybackScope(partial, 'smart', limiter)
  assert.equal(checkpoint, prepareTtsText(first))
  assert.equal(
    applyTtsLivePlaybackScope(final, 'smart', limiter, true, () => 0),
    `${prepareTtsText(first)}${TTS_SMART_TRUNCATION_OUTROS[0]}`,
  )
})

test('ends a chunk before the next sentence when combining them exceeds the preferred maximum', () => {
  const first = `${'甲'.repeat(100)}。`
  const next = `${'乙'.repeat(200)}。`
  assert.deepEqual(splitTtsSegments(first + next), [first, next].map(prepareTtsText))
  assert.equal(firstTtsSegment(first + next), prepareTtsText(first))
})

test('starts streaming an unfinished first sentence after enough speech arrives', () => {
  const limiter = new TtsFirstSegmentLimiter()
  const first = `${'甲'.repeat(100)}。`
  const next = `${'乙'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS + 40)}。`
  const prefix = prepareTtsText(next.slice(0, DEFAULT_TTS_SEGMENT_CHARACTERS))
  assert.equal(limiter.limit(prefix), prefix)
  assert.equal(limiter.limit(prefix + next.slice(DEFAULT_TTS_SEGMENT_CHARACTERS, 180)), prepareTtsText(next.slice(0, 180)))
  const whole = prepareTtsText(next)
  assert.equal(limiter.limit(whole), whole)
  assert.equal(limiter.limit(whole + first, true), whole)
})

test('does not lock a short completed first segment before the reply is complete', () => {
  const limiter = new TtsFirstSegmentLimiter()
  const short = limiter.limit('你好。')
  const extended = prepareTtsText('你好。这里是后续内容。')
  assert.ok(extended.startsWith(short))
  assert.equal(limiter.limit(extended, true), extended)
})

test('keeps provisional streaming text append-only while punctuation is still arriving', () => {
  const limiter = new TtsFirstSegmentLimiter()
  const prefix = '甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS)
  const first = limiter.limit(`${prefix}，`)
  const next = limiter.limit(`${prefix}，。`)
  assert.ok(next.startsWith(first))
})

test('reserves the second live segment for a short tail before an unfinished long sentence', () => {
  const limiter = new TtsFirstSegmentLimiter(2)
  const first = `${'甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS)}。`
  const short = `${'乙'.repeat(40)}。`
  const long = `${'丙'.repeat(300)}。`
  const expected = prepareTtsText(first + short)
  assert.equal(limiter.limit(first), prepareTtsText(first))
  assert.equal(limiter.limit(first + short), expected)
  assert.equal(limiter.limit(first + short + long.slice(0, DEFAULT_TTS_SEGMENT_CHARACTERS)), expected)
  assert.equal(limiter.limit(first + short + long), expected)
  assert.equal(limiter.limit(first + short + long, true), expected)
})

test('live scopes only grow within their final range as short tails become separate groups', () => {
  for (const count of [1, 2]) {
    for (const sizes of [[40, 300], [160, 40, 300], [160, 50, 200], [160, 100, 200], [100, 100, 40, 300]]) {
      const text = sizes.map((size, index) => `${String.fromCodePoint(0x7532 + index).repeat(size)}。`).join('')
      const expected = firstTtsSegments(text, count)
      const limiter = new TtsFirstSegmentLimiter(count)
      let previous = ''
      for (let length = 1; length <= text.length; length += 13) {
        const scoped = limiter.limit(text.slice(0, length))
        assert.ok(scoped.startsWith(previous), `scope ${count} shrank for sentence sizes ${sizes}`)
        assert.ok(expected.startsWith(scoped), `scope ${count} exceeded its final range for sentence sizes ${sizes}`)
        previous = scoped
      }
      const final = limiter.limit(text, true)
      assert.ok(final.startsWith(previous))
      assert.ok(expected.startsWith(final))
    }
  }
})

test('keeps the completed first sentence as the final Smart scope after provisional streaming', () => {
  const limiter = new TtsFirstSegmentLimiter()
  const sentence = `${'甲'.repeat(MAX_TTS_SEGMENT_CHARACTERS + 60)}。`
  assert.equal(limiter.limit(sentence.slice(0, DEFAULT_TTS_SEGMENT_CHARACTERS)), prepareTtsText(sentence.slice(0, DEFAULT_TTS_SEGMENT_CHARACTERS)))
  assert.equal(limiter.limit(sentence), prepareTtsText(sentence))
  assert.equal(limiter.limit(sentence + '后续内容。', true), prepareTtsText(sentence))
})

test('flushes an unterminated final sentence without hard cutting it', () => {
  const text = '甲'.repeat(MAX_TTS_SEGMENT_CHARACTERS + 60)
  const limiter = new TtsFirstSegmentLimiter()
  assert.equal(limiter.limit(text), prepareTtsText(text))
  assert.equal(limiter.limit(text, true), text)
  assert.deepEqual(splitTtsSegments(text), [text])
})

test('recognizes normalized and English sentence ends without splitting decimal numbers', () => {
  for (const first of ['数值是3.14。', 'Value is 3.14. ']) {
    const limiter = new TtsFirstSegmentLimiter()
    assert.equal(limiter.limit(`${first}下一句尚未完成`), prepareTtsText(first))
  }
  const first = `${'甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS)}3.14。`
  assert.equal(firstTtsSegment(first + '下一句。'.repeat(50)), prepareTtsText(first))
  const limiter = new TtsFirstSegmentLimiter()
  assert.equal(limiter.limit(`${'甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS)}3.`), prepareTtsText(`${'甲'.repeat(DEFAULT_TTS_SEGMENT_CHARACTERS)}3.`))
  assert.equal(limiter.limit(first + '下一句尚未完成'), prepareTtsText(first))
})
