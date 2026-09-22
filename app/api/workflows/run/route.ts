import { type NextRequest } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    inputs,
    files,
  } = body
  const { user } = getInfo(request)
  const res = await client.runWorkflow(inputs, user, true, files)
  return new Response(res.data as any, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
