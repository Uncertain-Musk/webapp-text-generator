import csv
import importlib.util
import shutil
import tempfile
import unittest
import sys
from pathlib import Path

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("validator", Path(__file__).with_name("validate-shopee-kb.py"))
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class QAValidationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for name in (*validator.FILES, "shopee_sources.csv"):
            shutil.copyfile(validator.ROOT / name, self.root / name)

    def tearDown(self):
        self.temp.cleanup()

    def mutate(self, action, filename="shopee_ads_qa.csv"):
        path = self.root / filename
        with path.open(encoding="utf-8", newline="") as f:
            rows = list(csv.reader(f))
        action(rows)
        with path.open("w", encoding="utf-8", newline="") as f:
            csv.writer(f).writerows(rows)

    def test_valid(self):
        self.assertEqual(sum(validator.validate(self.root).values()), 28)

    def test_column_order(self):
        self.mutate(lambda rows: rows[0].reverse())
        with self.assertRaises(ValueError):
            validator.validate(self.root)

    def test_extra_column(self):
        self.mutate(lambda rows: rows[0].append("source"))
        with self.assertRaises(ValueError):
            validator.validate(self.root)

    def test_encoding(self):
        (self.root / validator.FILES[0]).write_bytes(b"\xff\xfe")
        with self.assertRaises(UnicodeError):
            validator.validate(self.root)

    def test_empty(self):
        self.mutate(lambda rows: rows[1].__setitem__(1, ""))
        with self.assertRaises(ValueError):
            validator.validate(self.root)

    def test_duplicate(self):
        self.mutate(lambda rows: rows.append(rows[1]))
        with self.assertRaises(ValueError):
            validator.validate(self.root)

    def test_unmapped_question(self):
        self.mutate(lambda rows: rows[1].__setitem__(0, "unmapped"))
        with self.assertRaises(ValueError):
            validator.validate(self.root)

    def test_swapped_answers_same_source(self):
        def swap(rows):
            rows[1][1], rows[2][1] = rows[2][1], rows[1][1]
        self.mutate(swap)
        with self.assertRaises(ValueError):
            validator.validate(self.root)

    def test_site_mix(self):
        self.mutate(lambda rows: rows[4].__setitem__(6, "泰国"), "shopee_sources.csv")
        with self.assertRaises(ValueError):
            validator.validate(self.root)


if __name__ == "__main__":
    unittest.main()
