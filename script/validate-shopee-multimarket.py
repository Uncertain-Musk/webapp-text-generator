"""Validate the candidate against the reviewed evidence; does not call Dify."""
import argparse
import hashlib
import importlib.util
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'knowledge-base/research/shopee-multimarket-2026-10-11.json'
FILES = ('shopee_multimarket_qa.csv', 'shopee_multimarket_sources.csv',
         'shopee_multimarket_coverage.csv', 'shopee_multimarket_gaps.csv',
         'shopee_multimarket_test_queries.csv')
HOSTS = dict(SG='help.shopee.sg', MY='help.shopee.com.my', PH='help.shopee.ph',
             TH='help.shopee.co.th', VN='help.shopee.vn', TW='help.shopee.tw',
             BR='help.shopee.com.br', MX='help.shopee.com.mx', ID='help.shopee.co.id')


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


read_csv = module('original_shopee_validator', ROOT / 'script/validate-shopee-kb.py').read_csv
builder = module('shopee_multimarket_builder', ROOT / 'script/build-shopee-multimarket.py')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(root=ROOT / 'knowledge-base/shopee', manifest_path=MANIFEST):
    data = json.loads(manifest_path.read_text(encoding='utf-8'))
    expected = {q['qa_id']: q for q in data['qas']}
    tables = {name: read_csv(root / name) for name in FILES}
    columns, qas = tables[FILES[0]]
    require(columns == ['question', 'answer'], 'QA columns/order must be question,answer')
    require(len(qas) == len(expected), 'missing or extra QA')
    require(all(q['question'].strip() and q['answer'].strip() for q in qas), 'empty QA')
    questions = {q['question']: q['answer'] for q in qas}
    require(len(questions) == len(qas), 'duplicate question')
    mappings = defaultdict(list)
    seen = set()
    sources = tables[FILES[1]][1]
    for row in sources:
        qid, sid = row['qa_id'], row['source_id']
        require((qid, sid) not in seen, 'duplicate mapping')
        seen.add((qid, sid))
        require(qid in expected and sid in data['sources'], 'orphan mapping/source')
        qa, original = expected[qid], data['sources'][sid]
        require(sid in qa['source_evidence'], 'unexpected source for QA')
        require(row['question'] == qa['question'] and row['qa_file'] == FILES[0], 'question mapping mismatch')
        require(row['site'] == qa['site'] and row['markets'].split(',') == qa['markets'], 'site mapping mismatch')
        require(row['source_market'] == original['market'] and original['market'] in qa['markets'], 'cross-site source mismatch')
        require(row['topic'] == qa['topic'] and row['applies_to'] == qa['applies_to'], 'scope/topic mismatch')
        url = urlparse(row['url'])
        require(url.scheme == 'https' and url.hostname == HOSTS[row['source_market']]
                and not url.username and not url.password and not url.query
                and re.fullmatch(r'/portal/4/article/\d+', url.path), 'unreviewed official URL')
        require(row['url'] == original['url'], 'source URL differs from evidence')
        require(row['review_status'] == 'VERIFIED_BODY' and row['source_type'] == 'official_help_center', 'unreviewed source')
        require(row['source_title'] == original['title'] and row['evidence_locator'] == qa['source_evidence'][sid], 'evidence locator mismatch')
        require(row['evidence_excerpt'] == original['evidence_excerpt'] and bool(row['evidence_excerpt']), 'missing evidence excerpt')
        require(re.fullmatch(r'[a-f0-9]{64}', row['source_content_sha256']) and
                row['source_content_sha256'] == original['content_sha256'], 'source content hash mismatch')
        for field in ('page_date', 'page_date_label', 'effective_date', 'verified_at', 'fetched_at', 'limitations'):
            require(row[field] == original[field], f'source {field} differs from review')
        for field in ('page_date', 'effective_date', 'verified_at'):
            if row[field]:
                require(date.fromisoformat(row[field]) <= date.today(), 'future source date')
        require(datetime.fromisoformat(row['fetched_at']).date() <= date.today(), 'future fetch date')
        mappings[qid].append(row)
    require(set(mappings) == set(expected), 'missing QA mapping')
    for qid, qa in expected.items():
        require(qa['question'] in questions, 'missing reviewed question')
        answer = questions[qa['question']]
        require(qa['question'].startswith(f"【{qa['site']}】Shopee "), 'question lacks site prefix')
        require(set(r['source_id'] for r in mappings[qid]) == set(qa['source_evidence']), 'missing supporting source')
        require(builder.qa_hash(qa['question'], answer) == builder.qa_hash(qa['question'], builder.answer_for(qa, data)),
                'answer differs from reviewed evidence (possible column/answer swap)')
        require(all(r['qa_sha256'] == builder.qa_hash(qa['question'], answer) for r in mappings[qid]), 'QA hash mismatch')
        require(answer.startswith('适用范围：') and '适用对象：' in answer and
                f"核验日期：{data['verified_at']}" in answer, 'missing scope/date')
        require(all(r['url'] in answer for r in mappings[qid]), 'answer missing official URL')
    coverage = tables[FILES[2]][1]
    seen_cells = set()
    for cell in coverage:
        code, topic = cell['market'], cell['topic']
        require((code, topic) not in seen_cells, 'duplicate coverage cell')
        seen_cells.add((code, topic))
        require(code in data['markets'] and topic in builder.TOPICS and cell['site'] == data['markets'][code], 'invalid coverage site/topic')
        ids = {q['qa_id'] for q in expected.values() if q['markets'] == [code] and q['topic'] == topic}
        require(int(cell['new_qa_count']) == len(ids) and set(filter(None, cell['qa_ids'].split(','))) == ids, 'coverage count mismatch')
        legacy = 20 if code == 'SG' and topic == '广告经营' else 0
        require(int(cell['legacy_qa_count']) == legacy, 'legacy coverage mismatch')
        require(cell['status'] == ('PARTIAL' if ids or legacy else 'GAP'), 'unsupported complete coverage claim')
        require(cell['scope_limitations'], 'missing coverage limitation')
        gap_ids = {g['gap_id'] for g in data['gaps'] if code in g['markets'] and topic == g['topic']}
        require(set(filter(None, cell['open_gap_ids'].split(','))) == gap_ids, 'coverage Gap mapping mismatch')
    require(len(seen_cells) == len(data['markets']) * len(builder.TOPICS), 'incomplete coverage matrix')
    gaps = tables[FILES[3]][1]
    require(len(gaps) == len(data['gaps']), 'Gap count mismatch')
    require(len({g['gap_id'] for g in gaps}) == len(gaps), 'duplicate Gap')
    for row, original in zip(gaps, data['gaps']):
        require(row == dict(original, markets=','.join(original['markets'])), 'Gap differs from reviewed record')
        require(row['status'] == 'OPEN' and row['reason'] and row['next_action'], 'unexplained Gap')
    tests = tables[FILES[4]][1]
    require(tests == data['tests'], 'test set changed or falsely marked as executed')
    require(all(t['market_context'] in {'', 'SG', 'MY', 'PH'} for t in tests), 'test assumes unavailable UI market')
    require(all(t['execution_status'] == 'NOT_RUN' for t in tests), 'unexecuted Dify test claim')
    for test in tests:
        require(test['query'] and test['expected_behavior'] and test['forbidden_claims'], 'incomplete test case')
        require(all(qid in expected for qid in filter(None, test['expected_qa_ids'].split(','))), 'invalid test QA reference')
    return dict(status='PASS_LOCAL_CHECKS', dify_status='NOT_IMPORTED_NOT_TESTED',
                qa=len(qas), official_sources=len(data['sources']), source_mappings=len(sources),
                markets=len(data['markets']), market_counts=dict(Counter(q['site'] for q in expected.values())),
                coverage_cells=len(coverage), coverage_status=dict(Counter(c['status'] for c in coverage)),
                open_gaps=len(gaps), designed_tests=len(tests),
                file_sha256={name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in FILES})


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    report = validate()
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
