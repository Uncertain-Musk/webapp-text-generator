import { type NextRequest } from 'next/server'
import { CompletionClient } from 'dify-client'
import { v4 } from 'uuid'
import { DIFY_API_KEY, DIFY_API_URL } from '@/config/server'

export const getInfo = (request: NextRequest) => {
  const sessionId = request.cookies.get('session_id')?.value || v4()
  const user = `user_${sessionId}`
  return {
    sessionId,
    user,
  }
}

export const setSession = (sessionId: string) => {
  return { 'Set-Cookie': `session_id=${sessionId}` }
}

export const client = new CompletionClient(DIFY_API_KEY, DIFY_API_URL)
