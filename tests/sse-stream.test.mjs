import assert from 'node:assert/strict'
import test from 'node:test'

import { readSSEStream, stripHiddenThinking } from '../service/sse-stream.ts'

const encode = value => new TextEncoder().encode(value)

test('delivers chunked text events before workflow completion', async () => {
  const events = []
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encode('data: {"event":"workflow_started","workflow_run_id":"run-1"}\r\n'))
      controller.enqueue(encode('\r\ndata: {"event":"text_chunk","data":{"text":"第一'))
      controller.enqueue(encode('段"}}\r\n\r\ndata: {"event":"text_chunk","data":{"text":"第二段"}}\r\n\r\n'))
      controller.enqueue(encode('data: {"event":"workflow_finished","data":{"status":"succeeded"}}\r\n\r\n'))
      controller.close()
    },
  })

  await readSSEStream(new Response(body), event => events.push(event))

  assert.deepEqual(events.map(event => event.event), [
    'workflow_started',
    'text_chunk',
    'text_chunk',
    'workflow_finished',
  ])
  assert.equal(events[1].data.text, '第一段')
  assert.equal(events[2].data.text, '第二段')
})

test('propagates stream reader failures', async () => {
  const body = new ReadableStream({
    pull() {
      throw new Error('stream disconnected')
    },
  })

  await assert.rejects(
    readSSEStream(new Response(body), () => {}),
    /stream disconnected/,
  )
})

test('never exposes complete or partial think blocks while streaming', () => {
  assert.equal(stripHiddenThinking('<think>内部推理'), '')
  assert.equal(stripHiddenThinking('<think>内部推理</think>最终回答'), '最终回答')
  assert.equal(stripHiddenThinking('安全正文<thi'), '安全正文')
  assert.equal(stripHiddenThinking('开头<think>内部</think>结尾'), '开头结尾')
})
