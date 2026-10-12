/* Local fixture test. Usage: PLAYWRIGHT_MODULE=<path> node script/check-workflow-recovery-ui.cjs */
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.RECOVERY_TEST_URL || 'http://127.0.0.1:3003'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local test URL required')
const id = 'b908bb31-4fed-4820-9806-d28ffbf2c80b'
const event = data => `data: ${JSON.stringify(data)}\n\n`
const start = { event: 'workflow_started', workflow_run_id: id, recovery_token: 'fixture-token', data: { id } }
const partial = { event: 'text_chunk', data: { text: '保留的部分正文' } }
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const scenario of ['normal', 'recover', 'failed', 'empty_output', 'missing', 'cancel', 'late']) {
      const page = await browser.newPage()
      let runs = 0; let polls = 0
      await page.route('**/api/parameters', route => route.fulfill({ json: { user_input_form: [{ 'text-input': { label: '问题', variable: 'query', required: true, max_length: 4000 } }] } }))
      await page.route('**/api/workflows/run', async route => {
        runs++
        const body = route.request().postDataJSON()
        assert.equal(body.inputs.query, '不知道应该把广告预算投入哪些商品')
        assert.equal(body.platform_context, '')
        assert.equal(body.market_context, '')
        const completed = scenario === 'normal' || runs > 1
        const sse = (scenario === 'missing' ? '' : event(start)) + event(partial) + (completed ? event({ event: 'workflow_finished', data: { status: 'succeeded', outputs: { text: runs > 1 ? '新任务最终正文' : '正常最终正文' } } }) : '')
        await route.fulfill({ contentType: 'text/event-stream', body: sse })
      })
      await page.route('**/api/workflows/recover', async route => {
        polls++
        assert.deepEqual(route.request().postDataJSON(), { runId: id, token: 'fixture-token' })
        if (scenario === 'late') {
          await new Promise(resolve => setTimeout(resolve, 1500))
          await route.fulfill({ json: { status: 'succeeded', answer: '旧任务迟到正文' } }).catch(() => {})
          return
        }
        const status = scenario === 'recover' ? (polls === 1 ? 'running' : 'succeeded') : ['failed', 'empty_output'].includes(scenario) ? scenario : 'running'
        await route.fulfill({ json: { status, ...(status === 'succeeded' ? { answer: '恢复后的完整正文和末尾' } : {}) } })
      })
      await page.goto(base)
      await page.locator('#question').fill('不知道应该把广告预算投入哪些商品')
      await page.getByRole('button', { name: '开始分析', exact: true }).click()
      if (scenario === 'normal') {
        await page.getByText('正常最终正文', { exact: true }).waitFor()
        assert.equal(polls, 0)
      }
      else if (scenario === 'recover') {
        await page.getByText('保留的部分正文', { exact: true }).waitFor()
        await page.getByText('恢复后的完整正文和末尾', { exact: true }).waitFor()
        assert.equal(await page.getByText('保留的部分正文', { exact: true }).count(), 0)
        assert.equal(polls, 2)
      }
      else if (scenario === 'cancel' || scenario === 'late') {
        await page.getByRole('button', { name: '停止恢复', exact: true }).click()
        await page.getByText(/已停止恢复并保留生成内容/).waitFor()
        const before = polls
        if (scenario === 'late') {
          await page.getByRole('button', { name: '重新分析', exact: true }).click()
          await page.getByText('新任务最终正文', { exact: true }).waitFor()
          await page.waitForTimeout(1800)
          assert.equal(await page.getByText('旧任务迟到正文', { exact: true }).count(), 0)
        }
        else { await page.waitForTimeout(3200); assert.equal(polls, before) }
      }
      else {
        await page.getByRole('alert').filter({ hasText: '回答未完成' }).waitFor()
        await page.getByText('保留的部分正文', { exact: true }).waitFor()
        assert.equal(polls, scenario === 'missing' ? 0 : 1)
      }
      assert.equal(runs, scenario === 'late' ? 2 : 1, 'Only an explicit retry may start a second task')
      console.log(`PASS ${scenario}: runs=${runs}, polls=${polls}`)
      await page.close()
    }
  }
  finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
