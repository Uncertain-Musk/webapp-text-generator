export type SSEEvent = {
  event?: string
  [key: string]: any
}

const THINK_OPEN = '<think>'
const THINK_CLOSE = '</think>'

const trailingTokenFragmentLength = (text: string, token: string) => {
  const maxLength = Math.min(text.length, token.length - 1)
  for (let length = maxLength; length > 0; length -= 1) {
    if (text.endsWith(token.slice(0, length)))
      return length
  }
  return 0
}

export function stripHiddenThinking(text: string) {
  if (!text)
    return text

  const lowerText = text.toLowerCase()
  let cursor = 0
  let visibleText = ''

  while (cursor < text.length) {
    const thinkStart = lowerText.indexOf(THINK_OPEN, cursor)
    if (thinkStart === -1) {
      const remainder = text.slice(cursor)
      const hiddenFragmentLength = trailingTokenFragmentLength(remainder.toLowerCase(), THINK_OPEN)
      visibleText += remainder.slice(0, remainder.length - hiddenFragmentLength)
      break
    }

    visibleText += text.slice(cursor, thinkStart)
    const thinkEnd = lowerText.indexOf(THINK_CLOSE, thinkStart + THINK_OPEN.length)
    if (thinkEnd === -1)
      break
    cursor = thinkEnd + THINK_CLOSE.length
  }

  return visibleText.replace(/^\s+/, '')
}

export async function readSSEStream(response: Response, onEvent: (event: SSEEvent) => void) {
  if (!response.ok)
    throw new Error(`Network response was not ok (${response.status})`)

  const reader = response.body?.getReader()
  if (!reader)
    throw new Error('Streaming response body is unavailable')

  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const deliverLine = (line: string) => {
    if (!line.startsWith('data:'))
      return

    const data = line.slice(5).trimStart()
    if (!data || data === '[DONE]')
      return

    onEvent(JSON.parse(data) as SSEEvent)
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    lines.forEach(deliverLine)

    if (done)
      break
  }

  if (buffer)
    deliverLine(buffer)
}
