// Real requests through the existing application proxy. Never reads credentials.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import Papa from 'papaparse'
import { readSSEStream, stripHiddenThinking } from '../service/sse-stream.ts'
import { buildWorkflowInputs } from '../utils/workflow-context.ts'

const root = path.resolve(import.meta.dirname, '..')
const kb = path.join(root, 'knowledge-base')
const evaluationRoot = path.join(kb, 'evaluation')
const reports = path.join(kb, 'reports')
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const isolatedRun = args.includes('--output-dir')
const evaluation = path.resolve(root, option('--output-dir', evaluationRoot))
const reportPrefix = option('--report-prefix', isolatedRun ? 'mvp-0.3.1-final' : 'mvp-0.3.1')
const resultName = isolatedRun ? 'yuehai_mvp_0.3.1_results' : 'yuehai_policy_kb_v1_dify_results_mapping_fixed'
let historicalFiles = [evaluationRoot, reports].flatMap(directory => fs.readdirSync(directory, { withFileTypes: true })
  .filter(item => item.isFile() && !(directory === reports && item.name.startsWith(`${reportPrefix}-`))).map(item => path.relative(root, path.join(directory, item.name))))
fs.mkdirSync(evaluation, { recursive: true })
const baseURL = option('--base-url', 'http://127.0.0.1:3000').replace(/\/$/, '')
const phase = option('--phase', 'structure')
const statePath = path.join(evaluation, `${resultName}.json`)
const reviewPath = path.join(evaluation, 'yuehai_mvp_0.3.1_dify_reviews.json')
const testPath = path.join(evaluationRoot, 'yuehai_policy_kb_v1_test_queries.csv')
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const now = () => new Date().toISOString()
const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
const unknown = 'UNKNOWN'
const headers = ['test_id', 'query', 'platform_context', 'market_context', 'expected_type', 'expected_kb', 'expected_behavior',
  'actual_retrieval_query', 'actual_resolved_platform', 'actual_resolved_market', 'actual_kb', 'actual_dataset', 'actual_dataset_id', 'actual_document_id', 'actual_segment_id', 'actual_top1_question', 'actual_top1_source',
  'actual_top1_answer', 'actual_retrieval_questions', 'actual_retrieval_answers', 'actual_top1_relevant', 'http_status', 'streaming_ok', 'time_to_first_text_ms', 'total_latency_ms', 'cross_platform_error',
  'cross_market_error', 'retrieval_relevant', 'final_answer_correct', 'fallback_correct', 'final_answer', 'failure_layer', 'result', 'notes']
const results = new Set(['PASS', 'FAIL_ROUTING', 'FAIL_CONTEXT', 'FAIL_RETRIEVAL', 'FAIL_COVERAGE', 'FAIL_GENERATION', 'FAIL_API', 'EXPECTED_GAP', 'NEEDS_REVIEW'])
const layers = new Set(['API', 'ROUTER', 'CONTEXT', 'RETRIEVAL', 'COVERAGE', 'GENERATION', 'NONE'])
const protectedSources = ['general/yuehai_general_kb_v2.csv', 'policy/yuehai_policy_kb_v1.csv',
  'policy/yuehai_policy_kb_v1_sources.csv', 'evaluation/yuehai_knowledge_gaps.csv', 'evaluation/yuehai_policy_kb_v1_test_queries.csv']

function sanitize(value, key = '') {
  if (/authorization|api[_-]?key|secret|password|access[_-]?token|refresh[_-]?token|cookie/i.test(key)) return '[REDACTED]'
  if (Array.isArray(value)) return value.map(item => sanitize(item))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v, k)]))
  if (typeof value === 'string') return value.replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REDACTED]').replace(/\bapp-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED]')
  return value
}

function jsonFile(filename, value) { fs.writeFileSync(filename, `${JSON.stringify(sanitize(value), null, 2)}\n`, 'utf8') }
function csvFile(filename, data, fields = headers) {
  const safe = data.map(row => Object.fromEntries(fields.map(field => [field, sanitize(row[field] ?? '', field)])))
  fs.writeFileSync(filename, `\uFEFF${Papa.unparse({ fields, data: safe.map(row => fields.map(field => row[field])) }, { newline: '\n' })}\n`, 'utf8')
}
function readCSV(filename) {
  const parsed = Papa.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true })
  if (parsed.errors.length) throw new Error(`Invalid CSV: ${path.basename(filename)}`)
  return parsed.data
}
function snapshot() {
  const map = {}
  const walk = directory => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, item.name)
      if (item.isDirectory()) walk(filename)
      else if (item.isFile()) map[path.relative(root, filename).replaceAll('\\', '/')] = hash(fs.readFileSync(filename))
    }
  }
  for (const name of ['app', 'service', 'config', 'utils']) walk(path.join(root, name))
  for (const name of protectedSources) map[`knowledge-base/${name}`] = hash(fs.readFileSync(path.join(kb, name)))
  if (isolatedRun) for (const name of historicalFiles) map[name] = hash(fs.readFileSync(path.join(root, name)))
  for (const name of ['script/evaluate-dify-mvp-0.3.mjs',
    'knowledge-base/evaluation/yuehai_policy_kb_v1_dify_results.json',
    'knowledge-base/evaluation/yuehai_policy_kb_v1_dify_results.csv',
    'knowledge-base/evaluation/yuehai_mvp_0.3_smoke_results.csv',
    'knowledge-base/evaluation/yuehai_mvp_0.3_bad_cases.csv',
    'knowledge-base/evaluation/yuehai_mvp_0.3_dify_reviews.json',
    'knowledge-base/evaluation/yuehai_mvp_0.3_engineering_checks.json',
    'knowledge-base/reports/mvp-0.3-dify-evaluation.md']) map[name] = hash(fs.readFileSync(path.join(root, name)))
  return map
}
const tests = readCSV(testPath)
const localDocuments = {
  '跨境电商高频问答500条.csv': { type: 'General KB', prefix: 'G', rows: readCSV(path.join(kb, 'general/yuehai_general_kb_v2.csv')) },
  'yuehai_general_kb_v2.csv': { type: 'General KB', prefix: 'G', rows: readCSV(path.join(kb, 'general/yuehai_general_kb_v2.csv')) },
  'yuehai_policy_kb_v1.csv': { type: 'Policy KB', prefix: 'P', rows: readCSV(path.join(kb, 'policy/yuehai_policy_kb_v1.csv')) },
}
if (tests.length !== 54 || new Set(tests.map(test => test.test_id)).size !== 54) throw new Error('Expected 54 uniquely identified test queries')
const smoke = [
  { test_id: 'A01', query: 'ACOS 是什么？', expected_kb: 'General KB', expected_behavior: 'General KB / 通用知识正常回答。' },
  { test_id: 'A02', query: '跨境电商怎么筛选目标市场？', expected_kb: 'General KB', expected_behavior: 'General KB。' },
  { test_id: 'A03', query: '退款多久处理？', platform_context: 'TikTok Shop', market_context: 'US', expected_kb: 'Policy KB', expected_behavior: 'retrieval_query体现TikTok Shop美国站，主要使用对应Policy。' },
  { test_id: 'A04', query: 'TikTok Shop 美国站商品违规后怎么申诉？', platform_context: 'TikTok Shop', market_context: 'US', expected_kb: 'Policy KB', expected_behavior: 'TikTok Shop美国站Policy。' },
  { test_id: 'A05', query: '退货怎么处理？', platform_context: 'Amazon', market_context: 'US', expected_kb: 'Policy KB', expected_behavior: 'Amazon美国站Policy。' },
  { test_id: 'A06', query: 'Amazon 美国站 FBA 发货有什么要求？', platform_context: 'Amazon', market_context: 'US', expected_kb: 'Policy KB', expected_behavior: 'Amazon美国站Policy。' },
  { test_id: 'A07', query: 'Amazon 英国站退货规则是什么？', platform_context: 'Amazon', market_context: 'US', expected_kb: 'Expected Gap', expected_behavior: '显式UK覆盖US，不能将US规则冒充UK；信息不足时兜底。' },
  { test_id: 'A08', query: '你好', platform_context: 'TikTok Shop', market_context: 'US', expected_kb: 'Greeting', expected_behavior: '走greeting / 非知识检索分支。' },
].map(test => ({ platform_context: '', market_context: '', query_type: 'smoke', ...test }))

let state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {
  schema_version: '0.3.1', run_id: crypto.randomUUID(), started_at_utc: now(), timezone: 'Asia/Shanghai', test_date: localDate(),
  base_url: baseURL, test_source_sha256: hash(fs.readFileSync(testPath)), declared_model: '千问 3.8（用户提供）',
  observed_models: [], protection_baseline: snapshot(), preflight: null, structure: [], smoke: [], full: [], systemic_blockers: [], engineering: {},
  grading_policy: '自动检查只判定可证实的API/Streaming/显式字段故障；语义结论须保存逐条证据审查，无法判断保留NEEDS_REVIEW。',
}
if (state.base_url !== baseURL || state.test_source_sha256 !== hash(fs.readFileSync(testPath))) throw new Error('Existing run uses a different endpoint or test asset; preserve it before a new run')
// A resumed run protects its original history, not reports added by other work.
if (isolatedRun) historicalFiles = historicalFiles.filter(name => name in state.protection_baseline)

function deepFind(value, wanted, found = []) {
  if (!value || typeof value !== 'object') return found
  for (const [key, item] of Object.entries(value)) {
    if (wanted.has(key) && ['string', 'number'].includes(typeof item)) found.push(item)
    if (item && typeof item === 'object') deepFind(item, wanted, found)
  }
  return found
}
const lastValue = (events, keys) => {
  const values = events.flatMap(event => deepFind(event.data?.outputs || {}, new Set(keys)))
  return values.length ? String(values.at(-1)) : unknown
}
function metadataName(item) { return item.metadata?.dataset_name || item.dataset_name || unknown }
function topQuestion(item) {
  if (!item) return unknown
  const explicit = item.question || item.metadata?.question
  if (explicit) return explicit
  const match = String(item.content || '').match(/(?:^|\n)\s*(?:question|问题)\s*[:：]\s*([^\n]+)/i)
  return match?.[1]?.trim() || unknown
}
function sourceURL(item) {
  if (!item) return unknown
  return String(item.content || '').match(/官方页面\s*[:：]\s*(https?:\/\/[^\s；;。]+)/)?.[1]
    || item.metadata?.document_url || item.metadata?.source_url || unknown
}

async function preflight() {
  const check = { checked_at_utc: now(), endpoint: `${baseURL}/api/parameters`, http_status: unknown, variables: [], ok: false }
  try {
    const response = await fetch(check.endpoint, { signal: AbortSignal.timeout(45000) })
    check.http_status = response.status
    const data = await response.json()
    check.parameters = sanitize(data)
    check.variables = (data.user_input_form || []).flatMap(form => Object.values(form).map(item => ({ variable: item.variable, required: item.required, type: item.type })))
    check.missing = ['query', 'platform_context', 'market_context'].filter(name => !check.variables.some(item => item.variable === name))
    check.ok = response.ok && check.missing.length === 0
    if (!check.ok) state.systemic_blockers.push(`真实参数接口未确认全部输入变量：HTTP ${response.status}；缺少${check.missing.join(',') || '有效参数结构'}`)
  }
  catch (error) { check.error = sanitize(String(error.message)); state.systemic_blockers.push('真实参数接口调用失败，停止批量测试。') }
  state.preflight = check
  save()
  console.log(JSON.stringify({ stage: 'preflight', status: check.http_status, ok: check.ok, variables: check.variables.map(item => item.variable) }))
  return check.ok
}

async function runTest(test) {
  const start = performance.now()
  const body = { inputs: { query: test.query }, platform_context: test.platform_context || '', market_context: test.market_context || '', response_mode: 'streaming' }
  const record = { ...Object.fromEntries(headers.map(key => [key, unknown])), ...test, expected_type: test.expected_kb,
    final_answer: '', failure_layer: 'NONE', result: 'NEEDS_REVIEW', notes: '语义结果等待基于真实事件和回答审查。',
    request: { endpoint: `${baseURL}/api/workflows/run`, body, expected_server_inputs: buildWorkflowInputs(body.inputs, body) },
    started_at_utc: now(), events: [], text_chunks: [], retrieval_nodes: [], workflow_ids: [], event_counts: {}, context_delivery: 'SENT_TO_PROXY',
    streaming_ok: false, time_to_first_text_ms: '', http_status: unknown }
  const controller = new AbortController()
  let inactivity = setTimeout(() => controller.abort(), 60000)
  const overall = setTimeout(() => controller.abort(), 300000)
  let rawText = ''
  try {
    const response = await fetch(record.request.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
    record.http_status = response.status
    record.content_type = response.headers.get('content-type') || ''
    if (!response.ok) {
      record.error = sanitize(await response.text())
      record.result = 'FAIL_API'; record.failure_layer = 'API'; record.notes = `真实代理HTTP ${response.status}`
    }
    else if (!record.content_type.includes('text/event-stream')) {
      record.result = 'FAIL_API'; record.failure_layer = 'API'; record.notes = '响应不是现有SSE协议。'
    }
    else {
      await readSSEStream(response, event => {
        clearTimeout(inactivity); inactivity = setTimeout(() => controller.abort(), 60000)
        const received_ms = Math.round(performance.now() - start)
        record.events.push({ received_ms, ...sanitize(event) })
        record.event_counts[event.event] = (record.event_counts[event.event] || 0) + 1
        if (event.event === 'text_chunk') {
          const text = String(event.data?.text || '')
          rawText += text
          record.text_chunks.push({ received_ms, text: sanitize(text) })
          if (record.time_to_first_text_ms === '' && stripHiddenThinking(rawText).trim()) record.time_to_first_text_ms = received_ms
        }
      })
      const finished = record.events.findLast(event => event.event === 'workflow_finished')
      record.workflow_status = finished?.data?.status || unknown
      record.streaming_ok = Boolean(record.event_counts.text_chunk && finished && record.workflow_status === 'succeeded' && !record.event_counts.error)
      if (!record.streaming_ok) { record.result = 'FAIL_API'; record.failure_layer = 'API'; record.notes = '未完成有效text_chunk + succeeded workflow_finished流。' }
    }
  }
  catch (error) { record.error = sanitize(String(error.message)); record.result = 'FAIL_API'; record.failure_layer = 'API'; record.notes = '真实请求/流读取中断或超时。' }
  finally { clearTimeout(inactivity); clearTimeout(overall) }
  record.total_latency_ms = Math.round(performance.now() - start)
  record.raw_streaming_text = sanitize(rawText)
  record.final_answer = sanitize(stripHiddenThinking(rawText))
  const nodes = record.events.filter(event => event.event === 'node_finished')
  record.nodes = nodes.map(event => ({ received_ms: event.received_ms, ...event.data }))
  record.actual_retrieval_query = lastValue(nodes, ['retrieval_query'])
  record.actual_resolved_platform = lastValue(nodes, ['resolved_platform'])
  record.actual_resolved_market = lastValue(nodes, ['resolved_market'])
  record.actual_intent = lastValue(nodes, ['intent', 'class_name'])
  for (const node of record.nodes) {
    if (node.node_type === 'knowledge-retrieval') record.retrieval_nodes.push({ node_id: node.node_id, title: node.title, result: node.outputs?.result || [], inputs: node.inputs, status: node.status })
  }
  const retrieved = record.retrieval_nodes.flatMap(node => node.result)
  const names = [...new Set(retrieved.map(metadataName).filter(name => name !== unknown))]
  record.actual_kb = names.length ? names.join('; ') : unknown
  record.actual_top1_question = topQuestion(retrieved[0])
  record.actual_top1_source = sourceURL(retrieved[0])
  record.retrieval_top1_definition = '第一个实际完成的knowledge-retrieval节点返回数组的首项；多个节点分别保留在JSON，不猜最终LLM主要依据。'
  record.workflow_ids = [...new Set(record.events.map(event => event.workflow_run_id || event.data?.workflow_run_id).filter(Boolean))]
  const models = nodes.flatMap(event => deepFind({ inputs: event.data?.inputs, process_data: event.data?.process_data, execution_metadata: event.data?.execution_metadata }, new Set(['model_name', 'model'])))
  record.observed_models = [...new Set(models.map(String))]
  state.observed_models = [...new Set([...state.observed_models, ...record.observed_models])]
  const echoed = key => record.events.flatMap(event => deepFind({ inputs: event.data?.inputs, outputs: event.data?.outputs }, new Set([key])))
  if (echoed('platform_context').includes(body.platform_context) && echoed('market_context').includes(body.market_context)) record.context_delivery = 'DIFY_EVENT_ECHO_CONFIRMED'
  if (test.test_id === 'A08' && record.retrieval_nodes.length) { record.result = 'FAIL_ROUTING'; record.failure_layer = 'ROUTER'; record.notes = '问候实际执行了知识检索节点，需检查Router。' }
  return sanitize(record)
}

function applyReviews() {
  if (!fs.existsSync(reviewPath)) return
  const reviews = JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
  if (reviews.run_id && reviews.run_id !== state.run_id) throw new Error('Evidence reviews belong to a different run')
  for (const record of [...state.smoke, ...state.full]) {
    const review = reviews.cases?.[record.test_id]
    if (!review) continue
    if (review.result === 'FAIL_GENERATION' && !(review.correct_knowledge_row_ids?.length && review.correct_knowledge_row_ids.every(id => record.qa_checks?.some(item => item.local_row_id === id && item.status === 'CORRECT')))) throw new Error(`FAIL_GENERATION requires correctly retrieved QA evidence: ${record.test_id}`)
    if (!results.has(review.result) || !layers.has(review.failure_layer) || !review.evidence) throw new Error(`Invalid evidence review for ${record.test_id}`)
    for (const key of ['result', 'failure_layer', 'cross_platform_error', 'cross_market_error', 'fallback_correct', 'actual_top1_relevant', 'retrieval_relevant', 'final_answer_correct', 'notes', 'severity', 'recommended_next_action']) {
      if (key in review) record[key] = review[key]
    }
    record.review = review
  }
  state.evidence_review = { reviewed_at_utc: reviews.reviewed_at_utc, method: reviews.method }
}

function detectBlockers() {
  const add = message => { if (!state.systemic_blockers.includes(message)) state.systemic_blockers.push(message) }
  if (state.mapping_check?.misaligned.length) add('实际QA映射仍错位，立即停止后续测试。')
  if (state.smoke.some(record => record.result === 'FAIL_API')) add('冒烟API或Streaming存在明确故障，停止完整集。')
  if (state.smoke.filter(record => ['FAIL_ROUTING', 'FAIL_CONTEXT'].includes(record.result)).length >= (isolatedRun ? 4 : 1)) add('冒烟Router或Context存在系统性故障，停止完整集。')
  if (state.smoke.some(record => record.review?.systemic_blocker)) add('冒烟证据审查确认系统性错误，停止完整集。')
  if (!isolatedRun && state.smoke.filter(record => record.review?.explicit_policy_error === true).length >= 2) add('冒烟仍有多个明确政策错误，按旧轮次要求不执行54条。')
}
const average = values => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : unknown
const ratio = (n, d) => d ? `${n}/${d} (${(100 * n / d).toFixed(1)}%)` : 'NOT_RUN'
const md = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
function stats(records) {
  return { count: records.length, pass: records.filter(x => x.result === 'PASS').length, expected_gap: records.filter(x => x.result === 'EXPECTED_GAP').length,
    needs_review: records.filter(x => x.result === 'NEEDS_REVIEW').length, fail: records.filter(x => x.result.startsWith('FAIL_')).length }
}
function suggestedAction(record) {
  return ({ API: '检查本地代理、真实Dify服务/额度及流事件，不修改生产逻辑。', ROUTER: '后续核对Router分支条件。', CONTEXT: '后续核对Context Resolution输出和retrieval_query。',
    RETRIEVAL: '后续核对retrieval_query、排序、Top K及分库范围；本轮不调参数。', COVERAGE: '后续核验官方来源并补知识；本轮不改正文。', GENERATION: '后续核对回答与已召回依据及Prompt；本轮不改Prompt。', NONE: '依据保存事件与回答人工确认；正确Expected Gap保持边界。' })[record.failure_layer]
}


const oldState = JSON.parse(fs.readFileSync(path.join(evaluationRoot, 'yuehai_policy_kb_v1_dify_results.json'), 'utf8'))
const compact = value => String(value || '').normalize('NFC').replace(/\s/g, '')
const documents = [
  { prefix: 'G', group: 'General', type: 'General KB', rows: readCSV(path.join(kb, 'general/yuehai_general_kb_v2.csv')) },
  { prefix: 'P', group: 'Policy', type: 'Policy KB', rows: readCSV(path.join(kb, 'policy/yuehai_policy_kb_v1.csv')) },
]
const allLocalRows = documents.flatMap(doc => doc.rows.map((row, index) => ({ ...row, id: `${doc.prefix}${String(index + 1).padStart(4, '0')}`,
  type: doc.type, group: doc.prefix === 'G' ? 'General' : row['一级主题'].startsWith('Amazon') ? 'Amazon' : 'TikTok Shop' })))
const qaAnswer = hit => hit?.answer || String(hit?.content || '').match(/(?:^|\n)\s*(?:answer|答案)\s*[:：]\s*([\s\S]*)$/i)?.[1]?.trim() || unknown
function inspectQA(record) {
  const hits = record.retrieval_nodes.flatMap(node => node.result)
  record.qa_checks = hits.map(hit => {
    const question = topQuestion(hit), answer = qaAnswer(hit)
    const row = allLocalRows.find(row => compact(row['问题']) === compact(question))
    const oldMapping = allLocalRows.find(row => compact(row['答案']) === compact(question) && compact(row['关键行动']) === compact(answer))
    return { status: row ? compact(row['答案']) === compact(answer) ? 'CORRECT' : 'MISALIGNED' : oldMapping ? 'MISALIGNED' : 'UNVERIFIED',
      local_row_id: (row || oldMapping)?.id || unknown, group: (row || oldMapping)?.group || unknown,
      document_type: (row || oldMapping)?.type || unknown, actual_question: question, actual_answer: answer,
      expected_question: (row || oldMapping)?.['问题'] || unknown, expected_answer: (row || oldMapping)?.['答案'] || unknown,
      dataset_id: hit.metadata?.dataset_id || unknown, dataset_name: hit.metadata?.dataset_name || unknown,
      document_id: hit.metadata?.document_id || unknown, document_name: hit.metadata?.document_name || unknown,
      segment_id: hit.metadata?.segment_id || unknown, segment_position: hit.metadata?.segment_position || unknown,
      same_segment_id_seen_before_fix: oldState.smoke.concat(oldState.full).some(previous => previous.retrieval_nodes.some(node => node.result.some(oldHit => oldHit.metadata?.segment_id === hit.metadata?.segment_id))),
      score: hit.metadata?.score ?? unknown }
  })
  record.actual_top1_answer = qaAnswer(hits[0])
  record.actual_dataset = record.actual_kb
  for (const field of ['dataset_id', 'document_id', 'segment_id']) {
    const values = [...new Set(record.qa_checks.map(item => item[field]).filter(value => value !== unknown))]
    record[`actual_${field}`] = values.length ? values.join('; ') : unknown
  }
  record.actual_retrieval_questions = JSON.stringify(record.qa_checks.map(item => item.actual_question))
  record.actual_retrieval_answers = JSON.stringify(record.qa_checks.map(item => item.actual_answer))
  record.actual_document_types = [...new Set(record.qa_checks.filter(item => item.status === 'CORRECT').map(item => item.document_type))]
  if (record.test_id.startsWith('STRUCT-') && record.qa_checks.some(item => item.status === 'MISALIGNED')) {
    record.result = 'FAIL_RETRIEVAL'; record.failure_layer = 'RETRIEVAL'; record.severity = 'P0'
    const incorrect = record.qa_checks.filter(item => item.status === 'MISALIGNED')
    record.notes = `结构阻塞：实际检索返回${incorrect.length}条错位QA（${incorrect.map(item => item.local_row_id).join('、')}）。判断依据为真实Question/Answer与CSV逐项对照，不依据ID是否变化。未评价答案生成。`
    record.recommended_next_action = '人工核对当前Workflow所连dataset/document、重处理任务与实际QA预览；先让正确映射出现在当前Workflow返回中。本轮不修改Dify或检索参数。'
  }
}
function mappingSummary() {
  const checks = [...state.structure, ...state.smoke, ...state.full].flatMap(record => record.qa_checks.map(item => ({ test_id: record.test_id, ...item })))
  const structure = state.structure.flatMap(record => record.qa_checks)
  const groups = Object.fromEntries(['General', 'Amazon', 'TikTok Shop'].map(group => [group,
    [...new Set(structure.filter(item => item.status === 'CORRECT' && item.group === group).map(item => item.local_row_id))]]))
  const misaligned = checks.filter(item => item.status === 'MISALIGNED').map(item => ({ test_id: item.test_id, local_row_id: item.local_row_id, document_name: item.document_name }))
  return { status: misaligned.length ? 'BLOCKED' : Object.values(groups).every(ids => ids.length >= 3) ? 'VERIFIED' : 'INCOMPLETE',
    groups, correct_hit_count: checks.filter(item => item.status === 'CORRECT').length,
    unique_correct_rows: [...new Set(checks.filter(item => item.status === 'CORRECT').map(item => item.local_row_id))].length,
    misaligned, unverified_count: checks.filter(item => item.status === 'UNVERIFIED').length,
    rule: '实际Question与CSV问题、Answer与CSV答案逐字去空白对照；仅忽略空白，不丢掉来源或数字，不依赖旧segment_position。' }
}
const probes = ['G0001', 'G0003', 'G0011', 'P0001', 'P0037', 'P0044', 'P0062', 'P0072', 'P0079'].map(id => {
  const row = allLocalRows.find(row => row.id === id)
  return { test_id: `STRUCT-${id}`, query: row['问题'], platform_context: row.group === 'General' ? '' : row.group, market_context: row.group === 'General' ? '' : 'US',
    expected_kb: row.type, expected_behavior: '真实检索Question=CSV问题，Answer=CSV答案；仅核验结构，不评价该回答语义。', structure_group: row.group }
})
function metrics(records) {
  const gaps = records.filter(row => row.expected_kb === 'Expected Gap')
  return { status: records.length ? 'EXECUTED' : 'NOT_RUN', ...stats(records), layers: Object.fromEntries(['API', 'ROUTER', 'CONTEXT', 'RETRIEVAL', 'COVERAGE', 'GENERATION'].map(layer => [layer, records.filter(row => row.result.startsWith('FAIL_') && row.failure_layer === layer).length])),
    gap_correct: gaps.filter(row => row.fallback_correct === true).length, gap_total: gaps.length,
    cross_platform_errors: records.filter(row => row.cross_platform_error === true).length,
    cross_market_errors: records.filter(row => row.cross_market_error === true).length }
}
function save() {
  for (const record of [...state.structure, ...state.smoke, ...state.full]) inspectQA(record)
  state.mapping_check = mappingSummary()
  applyReviews(); detectBlockers()
  state.updated_at_utc = now()
  const current = snapshot()
  const previousProtection = state.protection
  state.protection = { baseline_files: Object.keys(state.protection_baseline).length,
    changed: Object.keys(state.protection_baseline).filter(name => current[name] !== state.protection_baseline[name]),
    added: Object.keys(current).filter(name => !(name in state.protection_baseline)), unchanged: JSON.stringify(state.protection_baseline) === JSON.stringify(current) }
  if (!state.protection.unchanged && !state.systemic_blockers.includes('业务或旧评测保护文件发生变化，须停止核查。')) state.systemic_blockers.push('业务或旧评测保护文件发生变化，须停止核查。')
  if (state.protection.unchanged && state.systemic_blockers.includes('业务或旧评测保护文件发生变化，须停止核查。')
    && previousProtection?.changed.length === 0 && previousProtection.added.length
    && previousProtection.added.every(name => /^knowledge-base[\\/](?:reports|evaluation)[\\/]/.test(name))) {
    state.protection_notices ||= []
    state.protection_notices.push({ checked_at_utc: now(), previous: previousProtection,
      resolution: '原保护文件内容未变；新增独立报告不属于本轮开始时的历史基线。固定历史保护清单后解除误报，保留此记录及新增文件。' })
    state.systemic_blockers = state.systemic_blockers.filter(message => message !== '业务或旧评测保护文件发生变化，须停止核查。')
  }
  state.summary = { structure_requests: state.structure.length, smoke: metrics(state.smoke), full: metrics(state.full) }
  const reviewDoc = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath, 'utf8')) : {}
  state.recommendation = reviewDoc.recommendation || (state.systemic_blockers.length || state.full.length < 54 ? 'FAIL' : stats(state.full).fail || stats(state.full).needs_review ? 'CONDITIONAL PASS' : 'PASS')
  jsonFile(statePath, state)
  csvFile(path.join(evaluation, 'yuehai_mvp_0.3.1_smoke_results.csv'), state.smoke)
  csvFile(path.join(evaluation, `${resultName}.csv`), state.full)
  const bad = [...state.structure.filter(row => row.result.startsWith('FAIL_')), ...state.smoke, ...state.full].filter(row => row.result !== 'PASS' && (!isolatedRun || row.result !== 'EXPECTED_GAP')).map((row, index) => ({
    bad_case_id: `MF-BAD-${String(index + 1).padStart(3, '0')}`, test_id: row.test_id, query: row.query, platform_context: row.platform_context,
    market_context: row.market_context, expected_behavior: row.expected_behavior, actual_behavior: row.final_answer || row.notes,
    result: row.result, failure_layer: row.failure_layer, severity: row.severity || (row.result === 'FAIL_API' ? 'P0' : 'P2'),
    root_cause_evidence: row.review?.evidence || row.notes, recommended_action: row.recommended_next_action || suggestedAction(row),
    notes: row.notes, recommended_next_action: row.recommended_next_action || suggestedAction(row) }))
  csvFile(path.join(evaluation, 'yuehai_mvp_0.3.1_bad_cases.csv'), bad, ['bad_case_id', 'test_id', 'query', 'platform_context', 'market_context', 'expected_behavior', 'actual_behavior', 'result', 'failure_layer', 'severity', 'root_cause_evidence', 'recommended_action', 'notes', 'recommended_next_action'])
  const m = metrics(state.full), old = metrics(oldState.full), all = [...state.structure, ...state.smoke, ...state.full]
  const echo = all.filter(row => row.nodes.some(node => node.node_type === 'start' && ['query', 'platform_context', 'market_context'].every(key => node.outputs?.[key] === row.request.expected_server_inputs[key])))
  const retrievals = all.flatMap(row => row.retrieval_nodes.map(node => ({ node, query: row.actual_retrieval_query })))
  state.diagnostics = { requests: all.length, start_input_echo_confirmed: echo.length, streaming_success: all.filter(row => row.streaming_ok).length,
    retrieval_nodes: retrievals.length, retrieval_query_matches: retrievals.filter(item => item.node.inputs?.query === item.query).length,
    raw_cross_platform_cases: state.full.filter(row => row.actual_resolved_platform && row.actual_resolved_platform !== unknown && row.qa_checks.some(item => item.status === 'CORRECT' && item.group !== 'General' && item.group !== row.actual_resolved_platform)).map(row => row.test_id),
    raw_cross_market_cases: state.full.filter(row => row.actual_resolved_market && !['US', unknown].includes(row.actual_resolved_market) && row.qa_checks.some(item => item.status === 'CORRECT' && item.group !== 'General')).map(row => row.test_id) }
  jsonFile(statePath, state)
  const comparison = ['# MVP 0.3.1｜QA映射修复前后比较', '', `日期：${state.test_date}（Asia/Shanghai）；新run_id：${state.run_id}。`, '',
    `结构核验：${state.mapping_check.status}；${Object.entries(state.mapping_check.groups).map(([group, ids]) => `${group} ${ids.length}条（${ids.join('、')}）`).join('；')}。`, '',
    '| ID | 修复前 | 修复后 | 修复后证据与判断 |', '| --- | --- | --- | --- |',
    ...smoke.map(test => { const before = oldState.smoke.find(row => row.test_id === test.test_id); const after = state.smoke.find(row => row.test_id === test.test_id); return `| ${test.test_id} | ${before?.result || unknown} | ${after?.result || 'NOT_RUN'} | ${md(after?.notes || '未执行')} |` }), '',
    '旧结果为导入映射错位下的历史观察，不能作为最终知识库质量结论。结果变化与映射修复一致时仅说明观察到改善；这是单次前后比较，无法排除模型随机性，不把全部变化自动归因于映射。', '',
    `完整集修复前：PASS 28 / EXPECTED_GAP 9 / NEEDS_REVIEW 9 / FAIL 8。${state.full.length === 54 ? `修复后：PASS ${m.pass} / EXPECTED_GAP ${m.expected_gap} / NEEDS_REVIEW ${m.needs_review} / FAIL ${m.fail}` : `修复后NOT_RUN/INCOMPLETE：已执行${state.full.length}/54，不生成通过率或错误数结论`}。未执行部分不是0错误。`, '',
    '| 指标 | 修复前 | 修复后 |', '| --- | --- | --- |']
  for (const [name, filter] of [['Policy通过率', row => row.expected_kb === 'Policy KB'], ['General通过率', row => row.expected_kb === 'General KB']]) {
    const a = oldState.full.filter(filter), b = state.full.filter(filter)
    comparison.push(`| ${name} | ${ratio(a.filter(row => row.result === 'PASS').length, a.length)} | ${state.full.length === 54 ? ratio(b.filter(row => row.result === 'PASS').length, b.length) : 'NOT_RUN/INCOMPLETE'} |`)
  }
  comparison.push(`| Generation Error（历史分类） | ${old.layers.GENERATION} | ${state.full.length === 54 ? m.layers.GENERATION : 'NOT_RUN/INCOMPLETE'} |`,
    `| Retrieval Error | ${old.layers.RETRIEVAL} | ${state.full.length === 54 ? m.layers.RETRIEVAL : 'NOT_RUN/INCOMPLETE'} |`,
    `| 正确Gap兜底率 | ${ratio(old.gap_correct, old.gap_total)} | ${state.full.length === 54 ? ratio(m.gap_correct, m.gap_total) : 'NOT_RUN/INCOMPLETE'} |`,
    `| 跨平台最终错误 | ${old.cross_platform_errors} | ${state.full.length === 54 ? m.cross_platform_errors : 'NOT_RUN/INCOMPLETE'} |`,
    `| 跨站点最终错误 | ${old.cross_market_errors} | ${state.full.length === 54 ? m.cross_market_errors : 'NOT_RUN/INCOMPLETE'} |`, '',
    '本轮只有充分且正确QA已召回后明显错答才能标FAIL_GENERATION。旧版5条Generation是错位映射下的历史分类，不能直接当作已证明的Prompt缺陷；本轮TEST-036/037因缺少充分知识归为Coverage。旧文件保留原分类，新报告说明标准差异，不覆盖旧结果。', '',
    ...state.systemic_blockers.map(message => `阻塞：${message}`), '', reviewDoc.comparison_analysis || '逐条审查尚未完成，暂不作因果结论。')
  if (isolatedRun && state.full.length) {
    comparison.push('', '## 固定54条逐条比较', '', '| ID | 修复前 | 修复后 | 本轮证据与判断 |', '| --- | --- | --- | --- |')
    for (const row of state.full) comparison.push(`| ${row.test_id} | ${oldState.full.find(item => item.test_id === row.test_id)?.result || unknown} | ${row.result} | ${md(row.review?.evidence || row.notes)} |`)
  }
  fs.writeFileSync(path.join(reports, isolatedRun ? `${reportPrefix}-comparison.md` : 'mvp-0.3.1-mapping-fix-comparison.md'), `${comparison.join('\n')}\n`)
  const lines = ['# 越海 AI MVP 0.3.1｜映射修复后真实验收', '', `日期：${state.test_date}（Asia/Shanghai）；模型事件：${state.observed_models.join(' / ') || unknown}。`, '',
    `参数接口HTTP ${state.preflight?.http_status || 'NOT_RUN'}，声明检查${state.preflight?.ok ? '通过' : '未通过'}。测试访问${baseURL}/api/workflows/run，使用现有代理、SDK与Streaming读取器。`, '',
    '## 结构核验', '', `状态：${state.mapping_check.status}。${state.mapping_check.rule}`, '',
    ...Object.entries(state.mapping_check.groups).map(([group, ids]) => `- ${group}：${ids.length}个唯一QA；${ids.join('、')}`), '',
    `全轮正确映射命中${state.mapping_check.correct_hit_count}次，唯一知识${state.mapping_check.unique_correct_rows}条；错位${state.mapping_check.misaligned.length}；无法核验${state.mapping_check.unverified_count}。检索Question/Answer、预期文本和metadata均保存在JSON qa_checks。`, '',
    '| 本地行 | 预期Question | 实际Question | 实际Answer | document / segment |', '| --- | --- | --- | --- | --- |',
    ...state.structure.flatMap(row => row.qa_checks.filter(item => item.status === 'MISALIGNED').map(item => `| ${item.local_row_id} | ${md(item.expected_question)} | ${md(item.actual_question)} | ${md(item.actual_answer)} | ${item.document_id} / ${item.segment_id} |`)), '',
    '结构核验按真实Question/Answer对照源CSV。错位时停止后续测试；未发生错位时依次完成各组样本。该检查不等同于管理API对全库启用与索引完成状态的证明。', '',
    '## 冒烟', '', '| ID | 结果 | 层 | 实际Top1 Question | 说明 |', '| --- | --- | --- | --- | --- |',
    ...state.smoke.map(row => `| ${row.test_id} | ${row.result} | ${row.failure_layer} | ${md(row.actual_top1_question)} | ${md(row.notes)} |`), '',
    state.smoke.length ? `完成${state.smoke.length}/8。${JSON.stringify(stats(state.smoke))}。` : 'NOT_RUN：0/8，因结构前置核验阻塞，未发送任何冒烟请求。', '', '## 完整54条', '',
    `修复前：PASS 28，EXPECTED_GAP 9，NEEDS_REVIEW 9，FAIL 8。`, '',
    state.full.length === 54 ? `修复后：PASS ${m.pass}，EXPECTED_GAP ${m.expected_gap}，NEEDS_REVIEW ${m.needs_review}，FAIL ${m.fail}。` : `尚未完成完整集：已执行${state.full.length}/54。${state.systemic_blockers.length ? '按阻塞策略停止。' : '等待结构与冒烟门槛或执行完成。'}`, '',
    '| 分组 | 数量 | PASS | EXPECTED_GAP | NEEDS_REVIEW | FAIL |', '| --- | ---: | ---: | ---: | ---: | ---: |']
  for (const [name, filter] of [['General', row => row.expected_kb === 'General KB'], ['Policy', row => row.expected_kb === 'Policy KB'],
    ['Amazon US（实际resolved）', row => row.actual_resolved_platform === 'Amazon' && row.actual_resolved_market === 'US'],
    ['TikTok US（实际resolved）', row => row.actual_resolved_platform === 'TikTok Shop' && row.actual_resolved_market === 'US']]) {
    const group = stats(state.full.filter(filter)); lines.push(state.full.length ? `| ${name} | ${group.count} | ${group.pass} | ${group.expected_gap} | ${group.needs_review} | ${group.fail} |` : `| ${name} | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |`)
  }
  lines.push('', '知识类型与平台分组重叠，不能相加；平台使用真实resolved字段。', '',
    state.full.length === 54 ? `正确Gap兜底：${ratio(m.gap_correct, m.gap_total)}。明确FAIL故障层：${JSON.stringify(m.layers)}。跨平台最终错误${m.cross_platform_errors}，跨站点最终错误${m.cross_market_errors}；UNKNOWN不能当作零错误证据。` : '完整集未执行，Gap、Generation、Coverage、跨平台与跨站点指标均为NOT_RUN，不按零错误汇报。', '',
    state.full.length ? `候选跨平台混入：${state.diagnostics.raw_cross_platform_cases.join('、') || '无'}；候选跨站点混入：${state.diagnostics.raw_cross_market_cases.join('、') || '无'}。不等于最终规则误用，未实现metadata filtering。` : '候选跨平台/跨站点污染：NOT_RUN。', '',
    '## 剩余P0/P1与修复方向', '', '| ID | 分类 | 层 | 级别 | 问题 | 下一步 |', '| --- | --- | --- | --- | --- | --- |',
    ...bad.filter(row => ['P0', 'P1'].includes(row.severity)).map(row => `| ${row.test_id} | ${row.result} | ${row.failure_layer} | ${row.severity} | ${md(row.notes)} | ${md(row.recommended_next_action)} |`), '',
    `${isolatedRun ? 'Bad Case只收录失败或待审，正确EXPECTED_GAP不收录。' : '旧模式Bad Case收录所有非PASS，正确EXPECTED_GAP不是政策错误。'}完整回答、实际召回Question和Answer、上下文与脱敏事件均保存于CSV/JSON；无法获取的字段为UNKNOWN。`, '',
    '## 工程与保护', '',
    `含结构探测的真实Streaming：${ratio(state.diagnostics.streaming_success, all.length)}；开始节点逐字段回显原query与两个上下文：${ratio(echo.length, all.length)}；检索输入等于retrieval_query：${ratio(state.diagnostics.retrieval_query_matches, retrievals.length)}。`, '',
    state.full.length ? `完整集平均总响应${average(state.full.map(row => row.total_latency_ms))} ms，平均首可见文本${average(state.full.map(row => row.time_to_first_text_ms).filter(Number.isFinite))} ms。` : '完整集延迟：NOT_RUN。结构请求的响应与首文本时间单独保存在JSON，不能作为54条延迟统计。', '',
    `业务、知识基线及旧评测哈希保护：${state.protection.unchanged ? 'PASS' : 'FAIL'}（${state.protection.baseline_files}文件）；变化：${state.protection.changed.join('、') || '无'}。评测不读取密钥，不调用Dify管理API。`, '',
    ...Object.entries(state.engineering).map(([key, value]) => `- ${key}：${md(JSON.stringify(value))}`), '',
    `产物安全检查：${md(state.artifact_security || '待验证')}`, '',
    '## 验收', '', state.recommendation, '', reviewDoc.recommendation_reason || '评测尚未完成，不能作为最终质量结论。', '',
    reviewDoc.prompt_recommendation || '目前没有足够证据决定修改千问Prompt；先按真实召回证据完成分类。', '',
    ...state.systemic_blockers.map(message => `阻塞：${message}`), '',
    '未修改生产代码、前端、模型、Prompt、知识正文、检索参数、Context Resolution或Router；未commit、未部署。旧结果完整保留。')
  fs.writeFileSync(path.join(reports, isolatedRun ? `${reportPrefix}-evaluation.md` : 'mvp-0.3.1-dify-evaluation.md'), `${lines.join('\n')}\n`)
  if (isolatedRun && reviewDoc.run_id === state.run_id && reviewDoc.final_report_markdown)
    fs.writeFileSync(path.join(reports, `${reportPrefix}-evaluation.md`), reviewDoc.final_report_markdown)
}
if (phase === 'report') { save(); console.log(JSON.stringify({ mapping: state.mapping_check, summary: state.summary, recommendation: state.recommendation })); process.exit(0) }
if (!['structure', 'smoke', 'full'].includes(phase)) throw new Error('Use --phase structure, smoke, full, or report')
if (!(await preflight())) process.exitCode = 2
else {
  save()
  if (state.systemic_blockers.length) throw new Error('Blocked; preserve evidence and wait for external configuration')
  if (phase !== 'structure' && state.mapping_check.status !== 'VERIFIED') throw new Error('Structure checks must verify 3 General, 3 Amazon and 3 TikTok QA before smoke/full')
  if (phase === 'full' && (state.smoke.length !== 8 || state.smoke.some(row => !row.review))) throw new Error('Full set requires 8 smoke cases with evidence reviews and no blockers')
  const target = phase === 'structure' ? state.structure : phase === 'smoke' ? state.smoke : state.full
  for (const test of phase === 'structure' ? probes : phase === 'smoke' ? smoke : tests) {
    if (target.some(row => row.test_id === test.test_id)) continue
    if (phase === 'structure' && test.structure_group !== 'General' && state.mapping_check.groups[test.structure_group].length >= 3) continue
    const record = await runTest(test)
    target.push(record); save()
    console.log(JSON.stringify({ test_id: record.test_id, http_status: record.http_status, streaming_ok: record.streaming_ok,
      latency: record.total_latency_ms, qa: record.qa_checks.map(item => ({ id: item.local_row_id, status: item.status })),
      mapping: state.mapping_check.status, result: record.result }))
    if (record.result === 'FAIL_API' || state.systemic_blockers.length) { state.systemic_blockers.push('真实调用或映射检查失败，停止后续请求。'); save(); break }
  }
  if (phase === 'structure' && state.mapping_check.status !== 'VERIFIED') { state.systemic_blockers.push('尚未核验三个分组各至少3条正确QA，停止后续测试。'); save(); process.exitCode = 2 }
}
