import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BUSINESS_TIPS,
  BUSINESS_TIPS_BATCH_COUNT,
  BUSINESS_TIPS_PER_BATCH,
  getBusinessTipsBatch,
} from '../data/business-tips.ts'

test('business tip pool is local, complete, and uniquely identified', () => {
  assert.equal(BUSINESS_TIPS.length, 30)
  assert.equal(new Set(BUSINESS_TIPS.map(tip => tip.id)).size, BUSINESS_TIPS.length)
  assert.ok(BUSINESS_TIPS.every(tip => tip.category && tip.content))
  assert.ok(BUSINESS_TIPS.every(tip => [...tip.content].length >= 35 && [...tip.content].length <= 65))
})

test('business tips rotate in non-overlapping groups of six', () => {
  assert.equal(BUSINESS_TIPS_PER_BATCH, 6)
  assert.equal(BUSINESS_TIPS_BATCH_COUNT, 5)

  for (let batchIndex = 0; batchIndex < BUSINESS_TIPS_BATCH_COUNT; batchIndex += 1) {
    const current = getBusinessTipsBatch(batchIndex)
    const next = getBusinessTipsBatch(batchIndex + 1)
    assert.equal(current.length, 6)
    assert.equal(next.length, 6)
    assert.equal(current.some(tip => next.some(nextTip => nextTip.id === tip.id)), false)
  }

  assert.deepEqual(getBusinessTipsBatch(BUSINESS_TIPS_BATCH_COUNT), getBusinessTipsBatch(0))
})
