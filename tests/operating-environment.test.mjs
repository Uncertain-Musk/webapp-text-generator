import assert from 'node:assert/strict'
import test from 'node:test'
import { parseOperatingEnvironment } from '../config/operating-environment.ts'

test('restores a valid platform and market without retaining extra data', () => {
  assert.deepEqual(parseOperatingEnvironment(JSON.stringify({ platform: 'tiktok', market: 'us', query: 'do not send' })), { platform: 'tiktok', market: 'us' })
})

test('rejects damaged, obsolete and cross-platform storage values', () => {
  for (const value of [null, '', '{', 'null', '[]', '42', '{}', '{"platform":"unknown","market":"us"}', '{"platform":"shopee","market":"us"}', '{"platform":"amazon"}'])
    assert.equal(parseOperatingEnvironment(value), null)
})
