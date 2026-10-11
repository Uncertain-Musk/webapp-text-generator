import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeAds, exampleInput, emptyInput, buildStageGuidance, adviceSources, funnelGeometry } from '../utils/shopee-ads.ts'

const guidance = input => buildStageGuidance(input, analyzeAds(input))
test('three stages carry evidence, concrete actions, monitoring and sources', () => {
  const stages = guidance(exampleInput)
  assert.deepEqual(stages.map(s => s.id), ['impressions', 'clicks', 'orders'])
  for (const stage of stages) {
    assert.ok(stage.fact.length > 12)
    assert.equal(stage.actions.length, 3)
    assert.ok(stage.monitor.length > 20)
    for (const id of stage.sources) assert.ok(adviceSources[id].url.startsWith('https://ads.shopee.sg/'))
  }
})
test('good overall result has specific maintenance instructions and bounded cost references', () => {
  const stages = guidance({ ...exampleInput, adType: 'search' })
  assert.match(stages[2].title, /达标/)
  assert.match(stages[2].monitor, /4×/)
  assert.match(stages[1].interpretation, /0.625/)
  assert.match(stages[2].interpretation, /12.5/)
  assert.match(stages[0].actions.join(' '), /保留/)
})
test('GMV Max receives learning/goal guidance instead of manual keyword operations', () => {
  const stages = guidance({ ...exampleInput, adType: 'gmvmax' })
  const actions = stages.flatMap(s => s.actions).join(' ')
  assert.match(actions, /学习期/)
  assert.doesNotMatch(actions, /调低关键词|新增关键词|切换.*匹配/)
})
test('invalid data and zeros never receive maintenance or expansion advice', () => {
  assert.ok(guidance(emptyInput).every(s => s.state === 'pending'))
  const zero = guidance({ ...exampleInput, impressions: '0', clicks: '0', spend: '0', orders: '0', sales: '0' })
  assert.match(zero[0].title, /没有曝光/)
  assert.match(zero[2].title, /没有归因订单/)
  assert.ok(!zero.some(s => s.title.includes('达标')))
})
test('no-click, no-order and below-breakeven states take precedence', () => {
  assert.match(guidance({ ...exampleInput, clicks: '0', orders: '0', sales: '0' })[1].title, /未产生点击/)
  assert.match(guidance({ ...exampleInput, orders: '0', sales: '0' })[2].title, /没有归因订单/)
  assert.match(guidance({ ...exampleInput, margin: '10' })[2].title, /保本/)
})
test('missing goal, unconfirmed margin, zero spend and mixed attribution do not imply proven profitability', () => {
  assert.doesNotMatch(guidance({ ...exampleInput, targetRoas: '' })[2].title, /达标/)
  assert.match(guidance({ ...exampleInput, marginConfirmed: false })[2].title, /核对/)
  assert.match(guidance({ ...exampleInput, spend: '0' })[2].title, /花费/)
  const mixed = guidance({ ...exampleInput, attribution: 'mixed', orders: '300' })
  assert.match(mixed[2].title, /核对/)
  assert.doesNotMatch(mixed[1].interpretation, /CPC 参考/)
})


test('target-met diagnosis quantifies headroom and provides a reviewable action plan', () => {
  const finding = analyzeAds(exampleInput).findings.find(f => f.id === 'target-met')
  assert.match(finding.discovery, /5×.*4×/)
  assert.match(finding.discovery, /25%/)
  assert.equal(finding.plan.length, 4)
  assert.match(finding.plan.map(p => p.detail).join(' '), /SGD 125/)
  assert.match(finding.plan.map(p => p.detail).join(' '), /不是新增预算/)
  assert.match(finding.plan.map(p => p.detail).join(' '), /取消.*退款/)
  const auto = analyzeAds({ ...exampleInput, adType: 'gmvmax' }).findings.find(f => f.id === 'target-met')
  assert.match(auto.plan.map(p => p.detail).join(' '), /学习期/)
  const noMargin = analyzeAds({ ...exampleInput, margin: '', marginConfirmed: false }).findings.find(f => f.id === 'target-met')
  assert.match(noMargin.discovery, /未核实/)
  assert.doesNotMatch(noMargin.discovery, /保本线 4/)
})


test('funnel widths respond to data without inventing positive zero counts', () => {
  const small = funnelGeometry([10000, 200, 10])
  const large = funnelGeometry([10000, 500, 10])
  assert.equal(small[0].width, 100)
  assert.ok(large[1].width > small[1].width)
  assert.equal(small[2].width, large[2].width)
  assert.deepEqual(funnelGeometry([0, 0, 0]).map(s => s.width), [0, 0, 0])
  assert.ok(funnelGeometry([100, 20, 40])[2].width > funnelGeometry([100, 20, 40])[1].width)
  assert.equal(funnelGeometry([-1, NaN, Infinity]).length, 0)
})
