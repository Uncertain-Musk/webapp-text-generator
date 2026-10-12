import { type NextRequest } from 'next/server'
import { getInfo } from '@/app/api/utils/common'
import { verifyRecoveryToken } from '@/app/api/utils/workflow-recovery'
import { DIFY_API_KEY, DIFY_API_URL } from '@/config/server'
import { stripHiddenThinking } from '@/service/sse-stream'

export const maxDuration = 15
export const runtime = 'nodejs'
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  }
  catch { return reply({ status: 'invalid_request' }, 400) }
  const { user } = getInfo(request)
  if (!body || !request.cookies.get('session_id')?.value || !verifyRecoveryToken(body.runId, user, body.token, DIFY_API_KEY))
    return reply({ status: 'unauthorized' }, 403)
  try {
    const url = new URL(`${DIFY_API_URL.replace(/\/$/, '')}/workflows/run/${encodeURIComponent(body.runId)}`)
    // Keep the original identity even on Dify versions that ignore this query parameter.
    url.searchParams.set('user', user)
    const upstream = await fetch(url, {
      headers: { Authorization: `Bearer ${DIFY_API_KEY}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
      redirect: 'error',
    })
    if (upstream.status === 404)
      return reply({ status: 'not_found' }, 404)
    if (!upstream.ok)
      return reply({ status: 'unavailable' }, 502)
    const detail = await upstream.json()
    if (detail.id !== body.runId || typeof detail.status !== 'string')
      return reply({ status: 'unavailable' }, 502)
    if (detail.status === 'succeeded') {
      const answer = typeof detail.outputs?.text === 'string' ? stripHiddenThinking(detail.outputs.text) : ''
      return reply(answer.trim() ? { status: 'succeeded', answer } : { status: 'empty_output' })
    }
    // Do not forward inputs, traces, provider errors or credentials to the browser.
    const allowed = ['running', 'pending', 'failed', 'stopped', 'paused', 'partial-succeeded']
    return reply({ status: allowed.includes(detail.status) ? detail.status : 'unknown' })
  }
  catch { return reply({ status: 'unavailable' }, 502) }
}
