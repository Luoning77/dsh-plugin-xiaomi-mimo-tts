import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareTtsText, splitCompletedTtsSentences } from '../lib/shared.js'

test('speech preparation holds unclosed code and resumes only after a valid matching fence', () => {
  for (const marker of ['```', '~~~~']) {
    const before = '正文。\n'
    const open = before + marker + 'js\nconst privateValue = 123;\n'
    assert.equal(prepareTtsText(open), prepareTtsText(before))
    assert.equal(prepareTtsText(open + marker.slice(0, -1) + '\n尾部代码'), prepareTtsText(before))
    assert.equal(prepareTtsText(open + marker + ' invalid\n尾部代码'), prepareTtsText(before))
    const closed = open + marker + '\n后文。'
    assert.equal(prepareTtsText(closed), prepareTtsText(before + '后文。'))
    assert.equal(splitCompletedTtsSentences(closed).inCode, false)
  }
})

test('unfinished fenced code stays excluded from completed and bounded speech', () => {
  const text = '正文。\n~~~python\n' + 'print(privateValue);'.repeat(100)
  assert.equal(prepareTtsText(text), '正文.')
  assert.equal(splitCompletedTtsSentences(text).inCode, true)
})

test('normalized sentence ends stream promptly while an unfinished decimal stays buffered', () => {
  assert.deepEqual(splitCompletedTtsSentences('第一句.第二句.未完').sentences, ['第一句.', '第二句.'])
  assert.equal(splitCompletedTtsSentences('温度是3.').consumed, 0)
  assert.deepEqual(splitCompletedTtsSentences('温度是3.14度.未完').sentences, ['温度是3.14度.'])
})
