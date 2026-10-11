import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeAds, exampleInput, emptyInput, formatMetric, summary } from '../utils/shopee-ads.ts'

test('reference metrics distinguish orders from conversions', () => {
  const r = analyzeAds({ ...exampleInput, conversions: '15' })
  assert.deepEqual(r.metrics, { ctr: 2, cpc: 0.5, cpm: 10, roas: 5, acos: 20, costPerOrder: 10, orderClick: 5, cvr: 7.5, breakEven: 4 })
})
test('missing input does not become zero', () => {
  const r = analyzeAds(emptyInput)
  assert.ok(Object.keys(r.errors).length)
  assert.equal(r.metrics.roas, null)
})
test('all zero is valid but insufficient and undefined ratios are unavailable', () => {
  const r = analyzeAds({ ...exampleInput, impressions: '0', clicks: '0', spend: '0', orders: '0', sales: '0', conversions: '0' })
  assert.equal(Object.keys(r.errors).length, 0)
  for (const key of ['ctr', 'cpc', 'cpm', 'roas', 'acos', 'costPerOrder', 'orderClick', 'cvr'])
    assert.equal(r.metrics[key], null)
  assert.ok(r.findings.some(f => f.id === 'insufficient'))
})
test('zero clicks, spend and sales have distinct meanings', () => {
  assert.equal(analyzeAds({ ...exampleInput, clicks: '0' }).metrics.cpc, null)
  assert.equal(analyzeAds({ ...exampleInput, spend: '0' }).metrics.roas, null)
  assert.equal(analyzeAds({ ...exampleInput, spend: '0' }).metrics.acos, 0)
  assert.equal(analyzeAds({ ...exampleInput, sales: '0' }).metrics.roas, 0)
  assert.equal(analyzeAds({ ...exampleInput, sales: '0' }).metrics.acos, null)
})
test('reject negative, non numeric, infinite, fractional counts and impossible clicks', () => {
  for (const value of ['-1', 'hello', 'Infinity', '1e309', '1.5', '0x10'])
    assert.ok(analyzeAds({ ...exampleInput, clicks: value }).errors.clicks)
  assert.ok(analyzeAds({ ...exampleInput, clicks: '10001' }).errors.clicks)
})
test('orders above clicks are attribution warnings, not arithmetic errors', () => {
  for (const attribution of ['click', 'view', 'mixed']) {
    const r = analyzeAds({ ...exampleInput, orders: '300', attribution })
    assert.equal(Object.keys(r.errors).length, 0)
    assert.ok(r.warnings.some(w => w.includes('订单')))
    assert.equal(r.metrics.orderClick, 150)
  }
})
test('optional targets and conversions are never inferred', () => {
  const r = analyzeAds({ ...exampleInput, targetRoas: '', conversions: '' })
  assert.equal(r.metrics.cvr, null)
  assert.ok(!r.findings.some(f => ['below-target', 'target-met'].includes(f.id)))
})
test('target and breakeven priorities prevent contradictory scaling advice', () => {
  const r = analyzeAds({ ...exampleInput, margin: '10', targetRoas: '4' })
  assert.equal(r.findings[0].id, 'below-breakeven')
  assert.ok(!r.findings.some(f => f.id === 'target-met'))
  assert.ok(analyzeAds({ ...exampleInput, targetRoas: '6' }).findings.some(f => f.id === 'below-target'))
})
test('margin range and explicit cost basis control breakeven', () => {
  for (const [margin, expected] of [['20', 5], ['50', 2], ['100', 1]])
    assert.equal(analyzeAds({ ...exampleInput, margin }).metrics.breakEven, expected)
  for (const margin of ['0', '-1', '101'])
    assert.ok(analyzeAds({ ...exampleInput, margin }).errors.margin)
  assert.equal(analyzeAds({ ...exampleInput, marginConfirmed: false }).metrics.breakEven, null)
})
test('dates and supported currency are validated and included in copy', () => {
  assert.ok(analyzeAds({ ...exampleInput, start: '2026-02-30' }).errors.start)
  assert.ok(analyzeAds({ ...exampleInput, end: '2026-01-01' }).errors.end)
  for (const currency of ['SGD', 'USD', 'THB', 'VND']) {
    const input = { ...exampleInput, currency, start: '2026-09-01', end: '2026-09-30' }
    assert.ok(summary(input, analyzeAds(input)).includes(currency))
    assert.ok(summary(input, analyzeAds(input)).includes('2026-09-30'))
    assert.ok(formatMetric('cpc', 0.5, currency).includes(currency))
  }
})
test('no-click and no-order rules follow actual input', () => {
  assert.ok(analyzeAds({ ...exampleInput, clicks: '0', orders: '0', sales: '0' }).findings.some(f => f.id === 'no-clicks'))
  assert.ok(analyzeAds({ ...exampleInput, orders: '0', sales: '0' }).findings.some(f => f.id === 'no-orders'))
})
test('very small positive amounts are not displayed as zero and sample copy is labelled', () => {
  assert.match(formatMetric('cpc', 0.000001, 'SGD'), /e-6/)
  assert.match(summary(exampleInput, analyzeAds(exampleInput), true), /演示数据/)
})
test('finite input whose ratio overflows is rejected instead of explained as zero denominator', () => {
  const r = analyzeAds({ ...exampleInput, spend: '0.' + '0'.repeat(319) + '1' })
  assert.ok(r.errors.spend)
  assert.equal(r.findings[0].id, 'invalid')
})
