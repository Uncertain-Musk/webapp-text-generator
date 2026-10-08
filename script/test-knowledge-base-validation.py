"""Exercise validation against isolated CSV copies. Never edits delivery files."""
import csv
import hashlib
import pathlib
import runpy
import shutil
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
V = runpy.run_path(str(ROOT / 'script/validate-knowledge-base.py'))
FILES = ['general/yuehai_general_kb_v2.csv', 'policy/yuehai_policy_kb_v1.csv',
         'policy/yuehai_policy_kb_v1_sources.csv', 'evaluation/yuehai_knowledge_gaps.csv',
         'evaluation/yuehai_policy_kb_v1_test_queries.csv']


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.kb = pathlib.Path(self.temp.name) / 'knowledge-base'
        for name in FILES:
            target = self.kb / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / 'knowledge-base' / name, target)
        self.original = pathlib.Path(self.temp.name) / 'original.csv'
        shutil.copyfile(self.kb / FILES[0], self.original)

    def edit(self, name, change):
        path = self.kb / name
        with path.open(encoding='utf-8-sig', newline='') as handle:
            rows = list(csv.reader(handle, strict=True))
        change(rows)
        with path.open('w', encoding='utf-8-sig', newline='') as handle:
            csv.writer(handle, lineterminator='\n').writerows(rows)

    def result(self):
        return V['validate'](self.kb, self.original)

    def assert_error(self, code):
        self.assertIn(code, {e['code'] for e in self.result()['errors']})

    def test_delivery_accepts_us_context_conflicts_and_empty_context(self):
        self.assertEqual([], self.result()['errors'])

    def test_original_and_imports_are_read_only(self):
        paths = [self.original] + [self.kb / n for n in FILES]
        before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
        self.result()
        self.assertEqual(before, {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})

    def test_changed_general_is_rejected(self):
        self.edit(FILES[0], lambda r: r[1].__setitem__(3, 'altered baseline'))
        self.assert_error('GENERAL_MATRIX_MISMATCH')

    def test_missing_bom_is_rejected(self):
        path = self.kb / FILES[1]
        path.write_bytes(path.read_bytes()[3:])
        self.assert_error('UTF8_BOM_REQUIRED')

    def test_empty_action_is_rejected(self):
        self.edit(FILES[1], lambda r: r[1].__setitem__(4, ''))
        self.assert_error('EMPTY_FIELD')

    def test_duplicate_question_is_rejected(self):
        self.edit(FILES[1], lambda r: r[2].__setitem__(2, r[1][2]))
        self.assert_error('DUPLICATE_QUESTION')

    def test_duplicate_answer_is_rejected(self):
        self.edit(FILES[1], lambda r: r[2].__setitem__(3, r[1][3]))
        self.assert_error('DUPLICATE_ANSWER')

    def test_source_mapping_is_checked(self):
        self.edit(FILES[2], lambda r: r[1].__setitem__(10, 'P9999'))
        self.assert_error('UNKNOWN_POLICY_ROW')

    def test_future_verified_date_is_rejected(self):
        self.edit(FILES[1], lambda r: r[1].__setitem__(3, r[1][3].replace('最后核验：2026-10-02', '最后核验：2026-10-03')))
        self.assert_error('DATE_AFTER_AS_OF')

    def test_source_label_colon_is_required(self):
        self.edit(FILES[1], lambda r: r[1].__setitem__(3, r[1][3].replace('官方来源：', '官方来源')))
        self.assert_error('POLICY_SOURCE_LABEL')

    def test_official_host_spoofing_and_url_credentials_are_rejected(self):
        for url in ['https://sell.amazon.com.evil.example/page', 'https://sell.amazon.com@evil.example/page',
                    'https://evil.example@sell.amazon.com/page', 'https://sell.amazon.com:444/page']:
            with self.subTest(url=url):
                self.assertFalse(V['url_check'](url, 'Amazon')[0])

    def test_ads_candidate_does_not_become_an_import_source(self):
        self.assertFalse(V['url_check']('https://ads.tiktok.com/help', 'TikTok Shop')[0])
        self.assertEqual([], self.result()['errors'])

    def test_negated_guarantee_is_not_an_absolute_promise(self):
        for text in ['申诉不保证通过', '不能保证通过']:
            self.assertIsNone(V['OVERCLAIM_RE'].search(text))
        self.assertIsNotNone(V['OVERCLAIM_RE'].search('保证通过'))

    def test_csv_escaping_preserves_quotes_and_commas(self):
        text = '检查订单, 标签写"本产品"；含中文逗号，保持单行。'
        self.edit(FILES[1], lambda r: r[1].__setitem__(4, text))
        result = self.result()
        self.assertEqual([], result['errors'])
        self.assertEqual([], result['files']['policy']['multiline_records'])

    def test_chinese_deadlines_and_responsibility_differences_are_reviewable(self):
        left = V['answer_signature']('收到退货后两天处理；卖家承担运费；官方来源：测试')
        right = V['answer_signature']('收到退货后三天处理；买家承担运费；官方来源：测试')
        self.assertIn('两天', left['numbers_times_percentages'])
        self.assertIn('三天', right['numbers_times_percentages'])
        self.assertNotEqual(left['responsibility_phrases'], right['responsibility_phrases'])

    def test_similar_queries_with_different_facts_are_reported_without_rewriting(self):
        def inject(rows):
            questions = [
                'Amazon 美国站卖家收到买家寄回的退货后，需要多久完成退款处理？',
                'Amazon 美国站卖家收到买家寄回的退货后，应当多久完成退款处理？',
            ]
            bodies = ['收到退货后两天处理；卖家承担运费', '收到退货后三天处理；买家承担运费']
            for row, question, body in zip(rows[1:3], questions, bodies):
                row[1] = '退款退货'
                row[2] = question
                source = row[3].split('官方来源：', 1)[1]
                row[3] = f'适用范围：Amazon 美国站；{body}；官方来源：{source}'
        self.edit(FILES[1], inject)
        target = self.kb / FILES[1]
        before = target.read_bytes()
        result = self.result()
        codes = {w['code'] for w in result['warnings']}
        self.assertIn('HIGHLY_SIMILAR_QUESTION', codes)
        self.assertIn('POTENTIAL_ANSWER_CONFLICT', codes)
        pair = next(c for c in result['potential_answer_conflicts'] if c['row_ids'] == ['P0001', 'P0002'])
        self.assertFalse(pair['semantic_conflict_confirmed'])
        self.assertEqual(before, target.read_bytes())


if __name__ == '__main__':
    unittest.main(verbosity=2)
