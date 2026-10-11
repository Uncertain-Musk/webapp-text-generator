"""Offline structural and reviewed-topic checks; not a substitute for source review."""
import csv
import io
import sys
from pathlib import Path
from datetime import date
from urllib.parse import urlparse

FILES = ("shopee_ads_qa.csv", "shopee_market_insights_qa.csv")
ROOT = Path(__file__).resolve().parents[1] / "knowledge-base" / "shopee"


def read_csv(path):
    text = path.read_bytes().decode("utf-8-sig", errors="strict")
    if "\ufffd" in text:
        raise ValueError(f"{path.name}: replacement character")
    reader = csv.DictReader(io.StringIO(text), strict=True)
    rows = list(reader)
    if any(None in row or any(value is None for value in row.values()) for row in rows):
        raise ValueError(f"{path.name}: malformed row")
    return reader.fieldnames, rows


def validate(root=ROOT):
    _, sources = read_csv(root / "shopee_sources.csv")
    mapping = {}
    ids = set()
    for source in sources:
        key = (source["qa_file"], source["question"])
        if key in mapping or source["qa_id"] in ids:
            raise ValueError("duplicate source mapping")
        ids.add(source["qa_id"])
        mapping[key] = source
        url = urlparse(source["url"])
        hosts = {"ads.shopee.sg", "ads.shopee.cn", "thelowdown.momentum.asia", "blog.google", "www.channelengine.com"}
        if url.scheme != "https" or url.hostname not in hosts or url.username or url.password:
            raise ValueError("unreviewed source host")
        if not all(source.get(k) for k in ("source_id", "source_title", "site", "source_type", "published_at", "review_status", "evidence_note")):
            raise ValueError("incomplete source record")
        if date.fromisoformat(source["verified_at"]) > date.today():
            raise ValueError("verification date is in the future")
        if url.hostname == "ads.shopee.sg" and source["site"] != "新加坡":
            raise ValueError("Singapore rule assigned to another site")
    seen = set()
    used = set()
    counts = {}
    for filename in FILES:
        columns, rows = read_csv(root / filename)
        if columns != ["question", "answer"]:
            raise ValueError("QA columns must be question,answer in that order")
        if not rows:
            raise ValueError("empty QA file")
        counts[filename] = len(rows)
        for row in rows:
            q, a = row["question"].strip(), row["answer"].strip()
            if not q or not a:
                raise ValueError("empty question or answer")
            if q in seen:
                raise ValueError("duplicate question")
            seen.add(q)
            key = (filename, q)
            if key not in mapping:
                raise ValueError("missing source mapping")
            used.add(key)
            source = mapping[key]
            scope = "中文跨境指南" if source["source_id"] == "CN" else source["site"]
            if not q.startswith("【" + scope + "】"):
                raise ValueError("question/site mismatch")
            if source["url"] not in a or "适用范围：" + source["site"] + "。" not in a:
                raise ValueError("answer/source/site mismatch")
            if source["verified_at"] not in a:
                raise ValueError("missing verification date")
            checks = source["semantic_checks"].split("|")
            if checks[0] not in q or any(term not in a for term in checks[1:]):
                raise ValueError(f"{source['qa_id']}: reviewed question/answer topic mismatch")
    if used != set(mapping):
        raise ValueError("orphan source mapping")
    return counts


if __name__ == "__main__":
    try:
        counts = validate(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT)
        print("PASS", counts, "Structural/site/topic checks only; facts require documented human review.")
    except (ValueError, UnicodeError, KeyError, csv.Error) as error:
        print("FAIL:", error)
        sys.exit(1)
