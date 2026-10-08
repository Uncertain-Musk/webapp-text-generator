import { type NextRequest } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'
import { buildWorkflowInputs } from '@/utils/workflow-context'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  let body
  let workflowInputs
  try {
    body = await request.json()
    workflowInputs = buildWorkflowInputs(body.inputs, body)
  }
  catch {
    return Response.json({ message: '请求参数格式不正确。' }, { status: 400 })
  }
  const { user } = getInfo(request)
  let res
  try {
    res = await client.runWorkflow(workflowInputs, user, true, body.files)
  }
  catch {
    // Do not log SDK errors: they can contain the server Authorization header.
    return Response.json({ message: 'Workflow 请求未成功，请检查服务状态和已发布应用的输入变量配置。' }, { status: 502 })
  }
  return new Response(res.data as any, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
