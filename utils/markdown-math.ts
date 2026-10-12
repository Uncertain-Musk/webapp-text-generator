// Normalize only presentation delimiters. Never alter fenced/inline code or values.
export function normalizeMathMarkdown(content: string) {
  const percent = (math: string) => math.replace(/(\d)%/g, '$1\\%')
  const display = (math: string) => `$$\n${percent(math.trim())}\n$$`
  const normalize = (text: string) => text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math: string) => display(math))
    .replace(/\\\(([^\n]*?)\\\)/g, (_, math: string) => `$${percent(math.trim())}$`)
    .replace(/(^|\n)[ \t]*\[\s*\n?([^\]]+?)\n?[ \t]*\][ \t]*(?=\n|$)/g, (original, before: string, math: string) =>
      /\\(?:frac|dfrac|times|div|sum|sqrt|text)\b/.test(math) ? `${before}${display(math)}` : original)
  const prose = (text: string) => {
    const code = /(`+)[\s\S]*?\1(?!`)|`[^]*$/g
    let result = ''
    let cursor = 0
    for (const match of text.matchAll(code)) {
      result += normalize(text.slice(cursor, match.index)) + match[0]
      cursor = match.index! + match[0].length
    }
    return result + normalize(text.slice(cursor))
  }
  let output = ''
  let pending = ''
  let fence = ''
  for (const line of content.split(/(?<=\n)/)) {
    if (fence) {
      output += line
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*(?:\\n)?$`).test(line))
        fence = ''
      continue
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (opening || /^(?: {4}|\t)/.test(line)) {
      output += prose(pending) + line
      pending = ''
      fence = opening?.[1] || ''
    }
    else {
      pending += line
    }
  }
  return output + prose(pending)
}
