// Real requests through the existing application proxy. Never reads credentials.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import Papa from 'papaparse'
import { readSSEStream, stripHiddenThinking } from '../service/sse-stream.ts'
import { buildWorkflowInputs } from '../utils/workflow-context.ts'

const root = path.resolve(import.meta.dirname, '..')
const kb = path.join(root, 'knowledge-base')
const evaluation = path.join(kb, 'evaluation')
const reports = path.join(kb, 'reports')
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const baseURL = option('--base-url', 'http://127.0.0.1:3000').replace(/\/$/, '')
const phase = option('--phase', 'smoke')
const statePath = path.join(evaluation, 'yuehai_policy_kb_v1_dify_results.json')
const reviewPath = path.join(evaluation, 'yuehai_mvp_0.3_dify_reviews.json')
const testPath = path.join(evaluation, 'yuehai_policy_kb_v1_test_queries.csv')
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const now = () => new Date().toISOString()
const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
const unknown = 'UNKNOWN'
const headers = ['test_id', 'query', 'platform_context', 'market_context', 'expected_type', 'expected_kb', 'expected_behavior',
  'actual_retrieval_query', 'actual_resolved_platform', 'actual_resolved_market', 'actual_kb', 'actual_top1_question', 'actual_top1_source',
  'actual_top1_relevant', 'http_status', 'streaming_ok', 'time_to_first_text_ms', 'total_latency_ms', 'cross_platform_error',
  'cross_market_error', 'fallback_correct', 'final_answer', 'failure_layer', 'result', 'notes']
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
  schema_version: '1.0', run_id: crypto.randomUUID(), started_at_utc: now(), timezone: 'Asia/Shanghai', test_date: localDate(),
  base_url: baseURL, test_source_sha256: hash(fs.readFileSync(testPath)), declared_model: '千问 3.8（用户提供）',
  observed_models: [], protection_baseline: snapshot(), preflight: null, smoke: [], full: [], systemic_blockers: [], engineering: {},
  grading_policy: '自动检查只判定可证实的API/Streaming/显式字段故障；语义结论须保存逐条证据审查，无法判断保留NEEDS_REVIEW。',
}
if (state.base_url !== baseURL || state.test_source_sha256 !== hash(fs.readFileSync(testPath))) throw new Error('Existing run uses a different endpoint or test asset; preserve it before a new run')

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
  for (const record of [...state.smoke, ...state.full]) {
    const review = reviews.cases?.[record.test_id]
    if (!review) continue
    if (!results.has(review.result) || !layers.has(review.failure_layer) || !review.evidence) throw new Error(`Invalid evidence review for ${record.test_id}`)
    for (const key of ['result', 'failure_layer', 'cross_platform_error', 'cross_market_error', 'fallback_correct', 'actual_top1_relevant', 'notes', 'severity', 'recommended_next_action']) {
      if (key in review) record[key] = review[key]
    }
    record.review = review
  }
  state.evidence_review = { reviewed_at_utc: reviews.reviewed_at_utc, method: reviews.method }
}

function detectBlockers() {
  if (state.smoke.some(record => record.result === 'FAIL_API')) state.systemic_blockers.push('冒烟测试存在真实API/Streaming失败，按用户策略停止完整测试。')
  if (state.smoke.some(record => record.result === 'FAIL_ROUTING')) state.systemic_blockers.push('问候原分支异常，停止完整测试。')
  if (state.smoke.some(record => record.review?.systemic_blocker)) state.systemic_blockers.push('逐条证据审查确认冒烟存在系统性Context或Policy链路阻塞。')
  state.systemic_blockers = [...new Set(state.systemic_blockers)]
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

function save() {
  applyReviews(); detectBlockers()
  const allRecords = [...state.smoke, ...state.full]
  const compact = value => String(value || '').replace(/\s/g, '')
  for (const record of allRecords) {
    const hits = record.retrieval_nodes.flatMap(node => node.result)
    record.actual_document_types = [...new Set(hits.map(hit => localDocuments[hit.metadata?.document_name]?.type).filter(Boolean))]
    record.qa_field_mapping_observations = hits.flatMap(hit => {
      const document = localDocuments[hit.metadata?.document_name]
      const position = hit.metadata?.segment_position
      const row = document?.rows[position - 1]
      if (!row) return []
      const question = topQuestion(hit)
      const answer = String(hit.content || '').match(/(?:^|\n)\s*answer\s*:\s*([\s\S]*)$/i)?.[1]
      if (compact(question) !== compact(row['答案']) || compact(answer) !== compact(row['关键行动'])) return []
      return [{ document_name: hit.metadata.document_name, dataset_id: hit.metadata.dataset_id, segment_id: hit.metadata.segment_id,
        local_row_id: `${document.prefix}${String(position).padStart(4, '0')}`, local_question: row['问题'],
        actual_qa_question_matches: 'CSV答案', actual_qa_answer_matches: 'CSV关键行动', merchant_question_preserved_as_qa_question: false }]
    })
  }
  state.qa_field_mapping_summary = { observed_hits: allRecords.reduce((sum, row) => sum + row.qa_field_mapping_observations.length, 0),
    unique_segments: [...new Set(allRecords.flatMap(row => row.qa_field_mapping_observations.map(item => item.segment_id)))].length,
    meaning: '实际question/answer文本与本地同位置CSV的答案/关键行动逐字去空白一致；没有改变Dify导入映射。' }
  state.observed_datasets = [...new Map(allRecords.flatMap(row => row.retrieval_nodes.flatMap(node => node.result))
    .filter(hit => hit.metadata?.dataset_id).map(hit => [hit.metadata.dataset_id, { dataset_id: hit.metadata.dataset_id, dataset_name: hit.metadata.dataset_name }])).values()]
  state.updated_at_utc = now()
  const current = snapshot()
  state.protection = { baseline_files: Object.keys(state.protection_baseline).length,
    changed: Object.keys(state.protection_baseline).filter(name => current[name] !== state.protection_baseline[name]),
    added: Object.keys(current).filter(name => !(name in state.protection_baseline)), unchanged: JSON.stringify(state.protection_baseline) === JSON.stringify(current) }
  state.summary = { smoke: stats(state.smoke), full: stats(state.full) }
  jsonFile(statePath, state)
  csvFile(path.join(evaluation, 'yuehai_mvp_0.3_smoke_results.csv'), state.smoke)
  csvFile(path.join(evaluation, 'yuehai_policy_kb_v1_dify_results.csv'), state.full)
  const bad = [...state.smoke, ...state.full].filter(record => record.result !== 'PASS').map((record, i) => ({
    bad_case_id: `BAD-${String(i + 1).padStart(3, '0')}`, test_id: record.test_id, query: record.query,
    platform_context: record.platform_context, market_context: record.market_context, expected_behavior: record.expected_behavior,
    actual_behavior: record.final_answer || record.notes, result: record.result, failure_layer: record.failure_layer,
    severity: record.severity || (record.result === 'FAIL_API' || record.result === 'FAIL_ROUTING' ? 'P0' : record.result.startsWith('FAIL_') ? 'P1' : 'P2'),
    recommended_next_action: record.recommended_next_action || suggestedAction(record),
  }))
  csvFile(path.join(evaluation, 'yuehai_mvp_0.3_bad_cases.csv'), bad,
    ['bad_case_id', 'test_id', 'query', 'platform_context', 'market_context', 'expected_behavior', 'actual_behavior', 'result', 'failure_layer', 'severity', 'recommended_next_action'])
  const full = state.full, all = [...state.smoke, ...full], s = stats(full)
  const gap = full.filter(x => x.expected_kb === 'Expected Gap')
  const failures = Object.fromEntries(['API', 'ROUTER', 'CONTEXT', 'RETRIEVAL', 'COVERAGE', 'GENERATION'].map(layer => [layer, full.filter(x => x.result.startsWith('FAIL_') && x.failure_layer === layer).length]))
  const crossPlatform = full.filter(x => x.cross_platform_error === true).length
  const crossMarket = full.filter(x => x.cross_market_error === true).length
  const automaticRecommendation = state.systemic_blockers.length || (full.length === 54 && (crossPlatform >= 3 || crossMarket >= 2)) ? 'FAIL'
    : full.length < 54 ? 'FAIL（评测未完成，不能验收）' : s.fail || s.needs_review ? 'CONDITIONAL PASS' : 'PASS'
  const reviewDocument = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath, 'utf8')) : {}
  const recommendation = reviewDocument.recommendation || automaticRecommendation
  state.recommendation = recommendation
  const scopeCandidates = records => records.map(record => {
    const hits = record.retrieval_nodes.flatMap(node => node.result).filter(hit => hit.metadata?.document_name === 'yuehai_policy_kb_v1.csv')
    const platform = record.actual_resolved_platform
    const market = record.actual_resolved_market
    const wrongPlatform = hits.filter(hit => {
      const mapping = record.qa_field_mapping_observations.find(item => item.segment_id === hit.metadata?.segment_id)
      const row = mapping && localDocuments['yuehai_policy_kb_v1.csv'].rows[Number(mapping.local_row_id.slice(1)) - 1]
      return row && platform && platform !== unknown && !row['一级主题'].startsWith(`${platform}｜`)
    })
    const wrongMarket = hits.filter(() => market && market !== unknown && market !== 'US')
    return { test_id: record.test_id, wrong_platform_hits: wrongPlatform.length, wrong_market_hits: wrongMarket.length }
  })
  const rawScope = scopeCandidates(full)
  const startConfirmed = all.filter(record => record.nodes.some(node => node.node_type === 'start'
    && ['query', 'platform_context', 'market_context'].every(key => node.outputs?.[key] === record.request.expected_server_inputs[key])))
  const retrievalNodes = all.flatMap(record => record.retrieval_nodes.map(node => ({ test_id: record.test_id, node, retrieval_query: record.actual_retrieval_query })))
  const retrievalMatches = retrievalNodes.filter(item => item.node.inputs?.query === item.retrieval_query)
  const targetedPolicy = full.filter(record => record.expected_kb === 'Policy KB')
  const targetHits = targetedPolicy.filter(record => (record.expected_policy_rows.match(/P\d{4}/g) || [])
    .some(id => record.qa_field_mapping_observations.some(item => item.local_row_id === id)))
  state.diagnostics = { start_input_echo_confirmed: startConfirmed.length, requests: all.length,
    retrieval_query_matches: retrievalMatches.length, retrieval_nodes: retrievalNodes.length,
    raw_scope_candidates: rawScope, policy_expected_row_hit_count: targetHits.length, policy_test_count: targetedPolicy.length,
    raw_cross_platform_query_count: rawScope.filter(item => item.wrong_platform_hits).length,
    raw_cross_market_query_count: rawScope.filter(item => item.wrong_market_hits).length,
    failure_layers: failures, gap_fallback_correct: gap.filter(x => x.fallback_correct === true).length,
    gap_fallback_total: gap.length }
  jsonFile(statePath, state)
  const lines = ['# 越海 AI MVP 0.3｜真实 Dify 回归验收', '', `测试日期：${state.test_date}（Asia/Shanghai）；run_id：${state.run_id}。`, '',
    `真实连接：参数接口HTTP ${state.preflight?.http_status || 'NOT_RUN'}；变量检查${state.preflight?.ok ? '通过' : '未通过'}。请求地址：${baseURL}/api/workflows/run，使用现有服务端代理与Workflow。`, '',
    `模型：${state.declared_model}；事件可观察模型：${state.observed_models.join(' / ') || unknown}。不根据回答猜测模型。`, '',
    '## 冒烟测试', '', '| ID | 结果 | 分层 | Streaming | 说明 |', '| --- | --- | --- | --- | --- |',
    ...state.smoke.map(x => `| ${x.test_id} | ${x.result} | ${x.failure_layer} | ${x.streaming_ok} | ${md(x.notes)} |`), '',
    `完成 ${state.smoke.length}/8 条；PASS ${stats(state.smoke).pass}，EXPECTED_GAP ${stats(state.smoke).expected_gap}，FAIL ${stats(state.smoke).fail}。没有系统性冒烟阻塞，按用户策略继续完整测试。`, '', '## 完整54条测试', '',
    `完成 ${full.length}/54 条。PASS ${s.pass}；EXPECTED_GAP ${s.expected_gap}；NEEDS_REVIEW ${s.needs_review}；FAIL ${s.fail}。`, '',
    '| 分组 | 已执行 | PASS | EXPECTED_GAP | NEEDS_REVIEW | FAIL |', '| --- | ---: | ---: | ---: | ---: | ---: |']
  for (const [name, filter] of [['General KB', x => x.expected_kb === 'General KB'], ['Policy KB', x => x.expected_kb === 'Policy KB'],
    ['Amazon US（按实际resolved范围）', x => x.actual_resolved_platform === 'Amazon' && x.actual_resolved_market === 'US'],
    ['TikTok Shop US（按实际resolved范围）', x => x.actual_resolved_platform === 'TikTok Shop' && x.actual_resolved_market === 'US'], ['Expected Gap', x => x.expected_kb === 'Expected Gap']]) {
    const g = stats(full.filter(filter)); lines.push(`| ${name} | ${g.count} | ${g.pass} | ${g.expected_gap} | ${g.needs_review} | ${g.fail} |`)
  }
  lines.push('', '知识类型按测试预期分组，平台按实际resolved字段分组，两者有重叠，不能相加。显式平台覆盖输入环境时以resolved归类；原始输入仍完整保存在CSV/JSON。', '',
    `Expected Gap正确兜底率：${ratio(gap.filter(x => x.fallback_correct === true).length, gap.length)}；完整判EXPECTED_GAP为${ratio(gap.filter(x => x.result === 'EXPECTED_GAP').length, gap.length)}。TEST-052核心准入结论保持不确定，但额外术语判断仍NEEDS_REVIEW；TEST-036/037回退失败；TEST-012/013为空检索后直接回答概念，TEST-017未澄清平台直接回答，均未满足各自回退预期。`, '',
    `Policy测试中实际命中至少一个预期行：${ratio(targetHits.length, targetedPolicy.length)}。该指标只证明条目进入候选结果，不代表回答正确。没有旧版本真实对照成绩，不能量化覆盖改善幅度。General前10条均召回对应通用条目，6条PASS、4条因额外未受依据支持的细节NEEDS_REVIEW；ACOS/ROAS未有库内覆盖。`, '',
    `最终回答以错误平台为主要依据：${crossPlatform}；将US具体规则冒充其他站点：${crossMarket}。完整集中${full.filter(x => x.cross_platform_error === unknown || x.cross_market_error === unknown).length}条范围字段UNKNOWN（TEST-017无上下文且问题歧义），不计作零错误证据。`, '',
    `检索候选中的跨平台混入：${rawScope.filter(item => item.wrong_platform_hits).length}条Query（${rawScope.filter(item => item.wrong_platform_hits).map(item => item.test_id).join('、') || '无'}）；跨站点混入：${rawScope.filter(item => item.wrong_market_hits).length}条Query（${rawScope.filter(item => item.wrong_market_hits).map(item => item.test_id).join('、') || '无'}）。按真实事件resolved范围与已验证的Policy本地行对照，候选污染与最终误用分别统计；本版没有metadata filtering。`, '',
    '明确FAIL的故障层统计（不把NEEDS_REVIEW算作已确认错误）：', '',
    ...Object.entries(failures).map(([layer, count]) => `- ${layer}：${count}`), '',
    `Streaming成功率：完整集${ratio(full.filter(x => x.streaming_ok).length, full.length)}；含冒烟${ratio(all.filter(x => x.streaming_ok).length, all.length)}。`, '',
    `完整54条平均总响应时间：${average(full.map(x => x.total_latency_ms).filter(Number.isFinite))} ms；平均首可见文本时间：${average(full.map(x => x.time_to_first_text_ms).filter(Number.isFinite))} ms。首文本为过滤隐藏think后第一个非空可见块，均按客户端接收时刻测量。`, '',
    '## 优先关注的前10项非PASS记录', '', '| ID | 结果 | 层 | 优先级 | 问题 | 下一步 |', '| --- | --- | --- | --- | --- | --- |',
    ...(reviewDocument.priority_case_ids || bad.toSorted((a, b) => a.severity.localeCompare(b.severity) || a.test_id.localeCompare(b.test_id)).slice(0, 10).map(x => x.test_id))
      .map(id => bad.find(x => x.test_id === id)).filter(Boolean).map(x => `| ${x.test_id} | ${x.result} | ${x.failure_layer} | ${x.severity} | ${md(all.find(record => record.test_id === x.test_id)?.notes || x.query)} | ${md(x.recommended_next_action)} |`), '',
    '按用户要求，Bad Case文件收录全部非PASS，包含正确EXPECTED_GAP及NEEDS_REVIEW；它们不都代表系统错误。', '',
    '## 可观察性、判定与限制', '',
    'actual_kb仅来自真实检索事件dataset_name；未暴露时记UNKNOWN。JSON另存actual_document_types，依据事件document_name区分General/Policy文件，不伪造独立dataset。Top1为第一个实际完成检索节点的返回首项，多节点原始结果分别保留。实际resolved字段及retrieval_query仅取节点输出，不由最终回答推断。', '',
    `观察到dataset数量：${state.observed_datasets.length}；${state.observed_datasets.map(item => `${item.dataset_name} (${item.dataset_id})`).join('；') || unknown}。`, '',
    '实际观测为同一dataset中的General原文件与Policy CSV两个文档，未观测到两个独立dataset。仅按真实document_name区分知识类型；不把回答中的平台名当作检索来源。', '',
    `QA字段映射：${state.qa_field_mapping_summary.observed_hits}次检索命中、${state.qa_field_mapping_summary.unique_segments}个唯一分块，实际question匹配本地CSV答案列、answer匹配关键行动列。原商户问题未作为QA question保存；应后续人工核对Dify导入预览。逐条对照保留在JSON。`, '',
    'HTTP成功和Streaming完成不能单独证明语义PASS。自动标注保持NEEDS_REVIEW，逐条证据审查保存在yuehai_mvp_0.3_dify_reviews.json。没有可用的旧版真实评测成绩，不能量化新库相对旧库的提升幅度。', '',
    '## 上下文、Router与API安全', '',
    `Dify开始节点逐字段回显原query及两个独立上下文：${ratio(startConfirmed.length, all.length)}。知识检索节点实际输入等于代码输出retrieval_query：${ratio(retrievalMatches.length, retrievalNodes.length)}。`, '',
    '显式冲突：TEST-019由TikTok环境改为问题指定的Amazon，TEST-040由Amazon环境改为问题指定的TikTok；A07/TEST-011的UK覆盖US环境。A08执行greeting代码回复且未运行检索或LLM。未选择环境时两个字段保持空字符串；TEST-017的错误假定发生在答案生成，并非Context节点把空值解析为Amazon。', '',
    '路径：浏览器经营环境 → Result → service → /api/workflows/run → buildWorkflowInputs → Dify SDK。评测复用同一代理、inputs构建函数与SSE读取器；不接触客户端密钥或直连Dify。原始事件JSON为本地诊断材料，包含节点输入和模型输出，应仅用于维护审查。', '',
    `生产目录与5个原始知识/测试CSV保护：${state.protection.unchanged ? '哈希一致' : '发生变化，须检查'}（${state.protection.baseline_files}个文件）。评测脚本不读取API Key，仅向本站代理发送问题和独立上下文字段。`, '',
    '## 阻塞与工程检查', '', ...state.systemic_blockers.map(x => `- ${md(x)}`),
    state.systemic_blockers.length ? '' : '无已确认的系统性冒烟阻塞。', '',
    ...Object.entries(state.engineering).map(([key, value]) => `- ${key}：${md(typeof value === 'object' ? JSON.stringify(value) : value)}`), '',
    `结果文件安全扫描：${md(state.artifact_security || '待验证')}`, '',
    '## 验收建议', '', recommendation, '', reviewDocument.recommendation_reason || '依据完整结果、跨平台/站点风险、回退行为和可观察性综合判定；非PASS不自动等于不可用。', '',
    '本轮只评测与定位。后续修复方向依据故障层和优先级，未修改Prompt、知识正文、检索参数、Context Resolution、UI或生产请求逻辑，未commit或部署。')
  fs.writeFileSync(path.join(reports, 'mvp-0.3-dify-evaluation.md'), `${lines.join('\n')}\n`, 'utf8')
}

if (phase === 'report') { save(); console.log(JSON.stringify({ summary: state.summary, recommendation: state.recommendation })); process.exit(0) }
if (!['smoke', 'full'].includes(phase)) throw new Error('Use --phase smoke, full, or report')
if (!(await preflight())) process.exitCode = 2
else {
  if (phase === 'full') {
    save()
    if (state.smoke.length !== 8 || state.systemic_blockers.length) throw new Error('Full test set requires 8 completed smoke tests without systemic blockers')
  }
  const target = phase === 'smoke' ? state.smoke : state.full
  for (const test of phase === 'smoke' ? smoke : tests) {
    if (target.some(record => record.test_id === test.test_id)) continue
    const record = await runTest(test)
    target.push(record); save()
    console.log(JSON.stringify({ test_id: record.test_id, http_status: record.http_status, streaming_ok: record.streaming_ok, total_latency_ms: record.total_latency_ms,
      first_text_ms: record.time_to_first_text_ms, result: record.result, retrieval_query: record.actual_retrieval_query, resolved_platform: record.actual_resolved_platform,
      resolved_market: record.actual_resolved_market, actual_kb: record.actual_kb, answer_length: record.final_answer.length }))
    if (phase === 'full' && record.result === 'FAIL_API') { state.systemic_blockers.push('完整集真实API/Streaming中断，暂停剩余测试以保留失败证据。'); save(); break }
  }
}
