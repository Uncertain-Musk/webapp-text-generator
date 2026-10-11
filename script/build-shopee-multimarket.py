"""Build the reviewed Shopee candidate only; never imports or changes old QA."""
import csv
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'knowledge-base/research/shopee-multimarket-2026-10-11.json'
OUTPUT = ROOT / 'knowledge-base/shopee'
QA_FILE = 'shopee_multimarket_qa.csv'
TOPICS = ('售后时限', '申诉争议', '商品合规', '物流履约', '费用税费', '广告经营')


def qa_hash(question, answer):
    return hashlib.sha256((question + '\0' + answer).encode('utf-8')).hexdigest()


def answer_for(qa, manifest):
    sources = [manifest['sources'][sid] for sid in qa['source_evidence']]
    scope = qa['site'] if len(qa['markets']) == 1 else '跨站点：' + '、'.join(
        manifest['markets'][market] for market in qa['markets'])
    references = '；'.join(f"{s['title']} {s['url']}" for s in sources)
    dates = '；'.join(f"{s['source_id']}：{s['page_date'] or s['page_date_label']}" for s in sources)
    return (f"适用范围：{scope}。适用对象：{qa['applies_to']}。{qa['answer_core']}"
            f" 官方来源：{references}。页面日期：{dates}。核验日期：{manifest['verified_at']}。")


def write_csv(path, columns, rows):
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)


def build(manifest_path=MANIFEST, output=OUTPUT):
    data = json.loads(manifest_path.read_text(encoding='utf-8'))
    output.mkdir(parents=True, exist_ok=True)
    qa_rows, source_rows = [], []
    for qa in data['qas']:
        answer = answer_for(qa, data)
        qa_rows.append({'question': qa['question'], 'answer': answer})
        for sid, locator in qa['source_evidence'].items():
            source = data['sources'][sid]
            source_rows.append(dict(
                qa_id=qa['qa_id'], qa_file=QA_FILE, question=qa['question'],
                site=qa['site'], markets=','.join(qa['markets']), topic=qa['topic'],
                applies_to=qa['applies_to'], source_id=sid, source_market=source['market'],
                source_title=source['title'], url=source['url'], source_type='official_help_center',
                page_date=source['page_date'], page_date_label=source['page_date_label'],
                effective_date=source['effective_date'], verified_at=source['verified_at'],
                fetched_at=source['fetched_at'], review_status=source['review_status'],
                evidence_locator=locator, evidence_excerpt=source['evidence_excerpt'],
                limitations=source['limitations'], source_content_sha256=source['content_sha256'],
                qa_sha256=qa_hash(qa['question'], answer)))
    write_csv(output / QA_FILE, ['question', 'answer'], qa_rows)
    write_csv(output / 'shopee_multimarket_sources.csv', list(source_rows[0]), source_rows)

    coverage = []
    for code, name in data['markets'].items():
        for topic in TOPICS:
            matches = [q for q in data['qas'] if q['markets'] == [code] and q['topic'] == topic]
            gaps = [g['gap_id'] for g in data['gaps'] if code in g['markets'] and g['topic'] == topic]
            legacy = 20 if code == 'SG' and topic == '广告经营' else 0
            limitation = '仅列已核验的具体问题，未覆盖该主题完整规则。' if matches or legacy else '尚无可导入的本地规则；不得套用其他站点。'
            if code == 'BR' and topic == '商品合规':
                limitation = '仅社区内容互动规范；完整商品禁售清单仍为Gap。'
            if code == 'ID' and topic == '物流履约':
                limitation = '仅说明退款政策不证明跨境准入；发货规则与中国卖家资格未核验。'
            if code == 'MY' and topic == '物流履约':
                limitation = '仅MY Direct Programme对象/未离仓退件；不是中国跨境SLS通用规则。'
            coverage.append(dict(market=code, site=name, topic=topic,
                status='PARTIAL' if matches or legacy else 'GAP', new_qa_count=len(matches),
                legacy_qa_count=legacy, qa_ids=','.join(q['qa_id'] for q in matches),
                example_question=matches[0]['question'] if matches else '',
                open_gap_ids=','.join(gaps), scope_limitations=limitation,
                verified_at=data['verified_at']))
    write_csv(output / 'shopee_multimarket_coverage.csv', list(coverage[0]), coverage)
    gaps = [dict(g, markets=','.join(g['markets'])) for g in data['gaps']]
    write_csv(output / 'shopee_multimarket_gaps.csv', list(gaps[0]), gaps)
    write_csv(output / 'shopee_multimarket_test_queries.csv', list(data['tests'][0]), data['tests'])
    return dict(new_qa=len(qa_rows), source_mappings=len(source_rows), sources=len(data['sources']),
                coverage_cells=len(coverage), gaps=len(gaps), designed_tests=len(data['tests']),
                market_counts=dict(Counter(q['site'] for q in data['qas'])))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(build(), ensure_ascii=False, indent=2))
