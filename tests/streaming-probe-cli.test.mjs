import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import http from 'node:http'
import { mkdtemp, readFile, rmdir, stat, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repo = fileURLToPath(new URL('../', import.meta.url))
function run(script, args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', script, ...args], { cwd: repo, env: { ...process.env, STREAM_DIAGNOSTIC_TOKEN: 'test-only-token-01234567890123456789' }, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', value => { stdout += value })
    child.stderr.on('data', value => { stderr += value })
    child.on('exit', code => resolve({ code, stdout, stderr }))
  })
}

test('preview diagnostic CLIs reject a production URL before issuing requests or writing evidence', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'yuehai-probe-'))
  t.after(() => rmdir(dir))
  const output = path.join(dir, 'result.json')
  const controlled = await run('script/diagnose-controlled-sse.mjs', ['--url', 'https://yuehaiai.netlify.app/', '--output', output])
  assert.notEqual(controlled.code, 0)
  assert.match(controlled.stderr, /Only a Yuehai Deploy Preview/)
  await assert.rejects(stat(output), { code: 'ENOENT' })
  const workflow = await run('script/diagnose-streaming.mjs', ['--query', 'probe', '--target', 'preview', '--preview-url', 'https://yuehaiai.netlify.app/', '--output-dir', path.join(dir, 'workflow')])
  assert.notEqual(workflow.code, 0)
  assert.match(workflow.stderr, /Yuehai Deploy Preview/)
  await assert.rejects(stat(path.join(dir, 'workflow')), { code: 'ENOENT' })
})

test('controlled probe CLI records premature EOF as failure without a fabricated completion', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'yuehai-probe-'))
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'X-Stream-Probe-Id': 'fixture-run' })
    res.end('data: {"event":"diagnostic_tick","probe_id":"fixture-run","seq":0,"elapsed_ms":0}\n\n')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    await unlink(path.join(dir, 'result.json'))
    await rmdir(dir)
  })
  const output = path.join(dir, 'result.json')
  const result = await run('script/diagnose-controlled-sse.mjs', ['--url', `http://127.0.0.1:${server.address().port}/`, '--local-rehearsal', '--output', output])
  assert.equal(result.code, 1)
  const record = JSON.parse(await readFile(output, 'utf8'))
  assert.equal(record.completed, false)
  assert.equal(record.last_event, 'diagnostic_tick')
  assert.equal(record.end_reason, 'eof_without_complete_sequence')
  assert.equal(record.events.length, 1)
  assert(!JSON.stringify(record).includes('test-only-token'))
})
