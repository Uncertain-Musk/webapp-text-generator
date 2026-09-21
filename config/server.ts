import 'server-only'

export const DIFY_API_KEY = process.env.DIFY_API_KEY || ''
export const DIFY_API_URL = process.env.DIFY_API_URL || ''
export const hasAppConfig = Boolean(DIFY_API_KEY && DIFY_API_URL)
