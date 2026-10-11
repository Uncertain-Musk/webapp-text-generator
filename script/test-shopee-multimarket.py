"""Inject known import/scope failures only into isolated temporary copies."""
import csv
import importlib.util
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True

SCRIPT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('validator', SCRIPT / 'validate-shopee-multimarket.py')
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class CandidateChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in validator.FILES:
            shutil.copyfile(validator.ROOT / 'knowledge-base/shopee' / name, self.root / name)

    def change(self, name, mutate):
        fields, rows = validator.read_csv(self.root / name)
        mutate(rows)
        with (self.root / name).open('w', encoding='utf-8', newline='') as handle:
            writer = csv.DictWriter(handle, fields, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(rows)

    def rejected(self, message):
        with self.assertRaisesRegex(ValueError, message):
            validator.validate(self.root)

    def test_valid_and_multiple_sources(self):
        result = validator.validate(self.root)
        self.assertEqual(result['markets'], 9)
        self.assertGreater(result['source_mappings'], result['qa'])
        self.assertEqual(result['dify_status'], 'NOT_IMPORTED_NOT_TESTED')

    def test_column_swap(self):
        path = self.root / validator.FILES[0]
        path.write_text(path.read_text(encoding='utf-8').replace('"question","answer"', '"answer","question"', 1), encoding='utf-8')
        self.rejected('columns/order')

    def test_same_source_answer_swap(self):
        def swap(rows):
            rows[0]['answer'], rows[1]['answer'] = rows[1]['answer'], rows[0]['answer']
        self.change(validator.FILES[0], swap)
        self.rejected('answer differs')

    def test_local_site_mismatch(self):
        self.change(validator.FILES[1], lambda rows: rows[0].update(source_market='MY'))
        self.rejected('cross-site source')

    def test_comparison_missing_source(self):
        def remove(rows):
            rows.pop(next(i for i, row in enumerate(rows) if row['site'] == '跨站点'))
        self.change(validator.FILES[1], remove)
        self.rejected('missing supporting source')

    def test_unreviewed_url(self):
        self.change(validator.FILES[1], lambda rows: rows[0].update(url='https://example.com/policy'))
        self.rejected('official URL')

    def test_verification_date_cannot_be_refreshed_without_review(self):
        self.change(validator.FILES[1], lambda rows: rows[0].update(verified_at='2099-01-01'))
        self.rejected('verified_at differs')

    def test_full_coverage_claim(self):
        self.change(validator.FILES[2], lambda rows: rows[0].update(status='COMPLETE'))
        self.rejected('complete coverage')

    def test_gap_cannot_be_hidden(self):
        self.change(validator.FILES[3], lambda rows: rows[0].update(status='CLOSED'))
        self.rejected('Gap differs')

    def test_fake_live_test_result(self):
        self.change(validator.FILES[4], lambda rows: rows[0].update(execution_status='PASS'))
        self.rejected('falsely marked')

    def test_bad_encoding(self):
        path = self.root / validator.FILES[0]
        path.write_bytes(path.read_bytes() + b'\xff')
        with self.assertRaises(UnicodeDecodeError):
            validator.validate(self.root)


if __name__ == '__main__':
    unittest.main(verbosity=2)
