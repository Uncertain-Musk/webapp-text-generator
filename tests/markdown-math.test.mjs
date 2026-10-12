import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { normalizeMathMarkdown } from '../utils/markdown-math.ts'
const formula = String.raw`ROAS = \frac{广告带来的收入}{广告花费}`
const render = value => renderToStaticMarkup(React.createElement(ReactMarkdown, { remarkPlugins: [remarkMath], rehypePlugins: [[rehypeKatex, { strict: 'ignore', trust: false }]] }, normalizeMathMarkdown(value)))
test('LaTeX bracket display formulas render actual fractions with Chinese text', () => {
  const html = render(`公式：\n\n\\[\n${formula}\n\\]`)
  assert(html.includes('katex-display'))
  assert(html.includes('mfrac'))
  assert(!html.includes('katex-error'))
})
test('standalone bare bracket math is recognized but ordinary brackets and links are preserved', () => {
  assert(render(`[\n${formula}\n]`).includes('mfrac'))
  for (const text of ['[普通说明]', '[文档](https://example.com)', '广告预算 [100, 200] 元'])
    assert.equal(normalizeMathMarkdown(text), text)
})
test('inline parentheses math and numeric percent render without losing the percent sign', () => {
  const html = render(String.raw`计算 \(ACOS = \frac{100}{500} \times 100%\)。`)
  assert(html.includes('katex'))
  assert(!html.includes('katex-error'))
  assert(html.includes('100\\%'))
})
test('fenced and inline code stay literal, including incomplete streaming fences', () => {
  for (const text of ['```latex\n\\[x=1\\]\n```', '~~~\n\\[x=1\\]\n~~~', '`\\(x=1\\)`', '``a ` \\[x=1\\]``', '```latex\n\\[x=1\\]'])
    assert.equal(normalizeMathMarkdown(text), text)
})
test('existing dollar math, escaped percentages and incomplete streaming equations are safe', () => {
  assert(render('$$\n'+formula+'\n$$').includes('mfrac'))
  assert.equal(normalizeMathMarkdown(String.raw`\[x = 10\%\]`), '$$\nx = 10\\%\n$$')
  assert.equal(normalizeMathMarkdown(String.raw`\[ROAS = \frac{100}`), String.raw`\[ROAS = \frac{100}`)
})
