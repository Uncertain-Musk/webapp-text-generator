import assert from 'node:assert/strict'
import test from 'node:test'
import { recoverWorkflowRun } from '../service/workflow-recovery.ts'
import { createRecoveryToken, verifyRecoveryToken, withRecoveryCredentials } from '../app/api/utils/workflow-recovery.ts'
const id = 'b908bb31-4fed-4820-9806-d28ffbf2c80b'
const credential = { runId: id, token: 'test-token' }
const signal = () => new AbortController().signal
const response = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

test('recovery polls original run until succeeded and returns final replacement', async () => {
  let calls = 0
  const result = await recoverWorkflowRun(credential, signal(), () => {}, {
    wait: async () => {}, fetcher: async (url, options) => {
      assert.equal(url, '/api/workflows/recover')
      assert.deepEqual(JSON.parse(options.body), credential)
      calls++
      return response(calls === 1 ? { status: 'running' } : { status: 'succeeded', answer: '完整回答' })
    },
  })
  assert.equal(calls, 2)
  assert.deepEqual(result, { status: 'succeeded', answer: '完整回答' })
})

test('missing run ID does not query or rerun', async () => {
  const result = await recoverWorkflowRun(null, signal(), () => {}, { fetcher: () => assert.fail('unexpected request') })
  assert.equal(result.status, 'missing_run')
})

test('failed, stopped, paused and empty output stop without success', async () => {
  for (const status of ['failed', 'stopped', 'paused', 'empty_output']) {
    let calls = 0
    const result = await recoverWorkflowRun(credential, signal(), () => {}, { fetcher: async () => { calls++; return response({ status }) } })
    assert.equal(result.status, status)
    assert.equal(calls, 1)
  }
})

test('running and transient errors have bounded attempts', async () => {
  for (const transient of [false, true]) {
    let calls = 0
    const result = await recoverWorkflowRun(credential, signal(), () => {}, { wait: async () => {}, fetcher: async () => { calls++; if (transient) throw new Error('offline'); return response({ status: 'running' }) } })
    assert.equal(calls, 12)
    assert.equal(result.status, transient ? 'unavailable' : 'pending')
  }
})

test('cancel stops polling and never returns a success', async () => {
  const controller = new AbortController()
  let calls = 0
  await assert.rejects(recoverWorkflowRun(credential, controller.signal, () => {}, { wait: async () => { controller.abort() }, fetcher: async () => { calls++; return response({ status: 'running' }) } }), { name: 'AbortError' })
  assert.equal(calls, 1)
})

test('recovery credentials bind session, run and expiry', () => {
  const token = createRecoveryToken(id, 'user_a', 'secret', 1000)
  assert(verifyRecoveryToken(id, 'user_a', token, 'secret', 1001))
  assert(!verifyRecoveryToken(id, 'user_b', token, 'secret', 1001))
  assert(!verifyRecoveryToken('a908bb31-4fed-4820-9806-d28ffbf2c80b', 'user_a', token, 'secret', 1001))
  assert(!verifyRecoveryToken(id, 'user_a', token, 'secret', 601001))
  assert(!verifyRecoveryToken(id, 'user_a', token + 'x', 'secret', 1001))
})

test('stream forwards split UTF-8, ping and text while signing server observed run', async () => {
  const text = `event: ping\ndata: {"event":"workflow_started","workflow_run_id":"${id}","data":{"id":"${id}"}}\n\ndata: {"event":"text_chunk","data":{"text":"部分中文"}}\n\n`
  const bytes = new TextEncoder().encode(text)
  const input = new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close() } })
  const result = await new Response(withRecoveryCredentials(input, 'user_a', 'secret')).text()
  assert(result.includes('event: ping'))
  const started = JSON.parse(result.split('\n')[1].slice(6))
  assert(verifyRecoveryToken(id, 'user_a', started.recovery_token, 'secret'))
  assert(result.includes('部分中文'))
  assert(!result.includes('workflow_finished'))
})
