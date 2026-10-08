import assert from 'node:assert/strict'
import test from 'node:test'
import { toWorkflowContext } from '../config/operating-environment.ts'
import { buildWorkflowInputs } from '../utils/workflow-context.ts'

test('maps stored IDs to separate Dify context values', () => {
  assert.deepEqual(toWorkflowContext({ platform: 'tiktok', market: 'us' }), { platform_context: 'TikTok Shop', market_context: 'US' })
  assert.deepEqual(toWorkflowContext(null), { platform_context: '', market_context: '' })
  assert.deepEqual(toWorkflowContext({ platform: 'shopee', market: 'us' }), { platform_context: '', market_context: '' })
})

test('server merges context without changing query or other workflow inputs', () => {
  const inputs = { query: 'Amazon 英国站退款如何处理？', custom: 42 }
  const result = buildWorkflowInputs(inputs, { platform_context: 'TikTok Shop', market_context: 'US' })
  assert.deepEqual(result, { ...inputs, platform_context: 'TikTok Shop', market_context: 'US' })
  assert.deepEqual(inputs, { query: 'Amazon 英国站退款如何处理？', custom: 42 })
})

test('legacy clients and cleared environment send explicit empty context', () => {
  assert.deepEqual(buildWorkflowInputs({ query: '退款如何处理？' }, {}), { query: '退款如何处理？', platform_context: '', market_context: '' })
  assert.deepEqual(buildWorkflowInputs({ query: '问题', platform_context: 'stale', market_context: 'old' }, { platform_context: '', market_context: '' }), { query: '问题', platform_context: '', market_context: '' })
})

test('server rejects malformed context instead of passing objects upstream', () => {
  assert.throws(() => buildWorkflowInputs({ query: '问题' }, { platform_context: { bad: true } }), TypeError)
  assert.throws(() => buildWorkflowInputs(null, {}), TypeError)
  assert.throws(() => buildWorkflowInputs([], {}), TypeError)
})
