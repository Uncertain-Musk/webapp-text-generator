export type WorkflowContext = { platform_context: string; market_context: string }

export const isWorkflowContextKey = (key: string) => key === 'platform_context' || key === 'market_context'

// The API accepts context alongside inputs. Only the server merges it for Dify.
export function buildWorkflowInputs(inputs: unknown, context: { platform_context?: unknown; market_context?: unknown }) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs))
    throw new TypeError('inputs must be an object')
  const normalize = (value: unknown) => {
    if (value === undefined || value === null)
      return ''
    if (typeof value !== 'string')
      throw new TypeError('context must be a string')
    return value
  }
  return {
    ...inputs,
    platform_context: normalize(context.platform_context),
    market_context: normalize(context.market_context),
  }
}
