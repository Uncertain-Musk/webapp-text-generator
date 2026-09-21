import 'server-only'

// Keep the template's environment variable names; only read credentials on the server.
export const APP_ID = process.env.NEXT_PUBLIC_APP_ID || ''
export const API_KEY = process.env.NEXT_PUBLIC_APP_KEY || ''
export const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
export const hasAppConfig = Boolean(APP_ID && API_KEY && API_URL)
