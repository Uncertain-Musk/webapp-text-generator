"""Read-only checks for the portable Shopee advertising P0 candidate package."""
import csv
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "knowledge-base" / "shopee"
PACKAGE = BASE / "p0-candidate"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_qa(path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        require(reader.fieldnames == ["question", "answer"], f"Invalid QA columns: {path.name}")
        rows = list(reader)
    require(all(set(row) == {"question", "answer"} and all(isinstance(value, str) and value.strip() for value in row.values()) for row in rows), f"Empty or malformed QA: {path.name}")
    return rows


def validate():
    review = json.loads((PACKAGE / "review.json").read_text(encoding="utf-8"))
    require(review["schema_version"] == 1, "Unsupported review schema")
    questions = {}
    for filename, count in [("shopee_ads_qa.csv", 50), ("shopee_market_insights_qa.csv", 8)]:
        rows = read_qa(PACKAGE / filename)
        require(len(rows) == count, f"Unexpected QA count: {filename}")
        original = read_qa(BASE / filename)
        require(rows[:len(original)] == original, f"Original QA changed: {filename}")
        require(hashlib.sha256((PACKAGE / filename).read_bytes()).hexdigest() == review["qa_files_sha256"][filename], f"Reviewed QA hash mismatch: {filename}")
        for row in rows:
            require(row["question"] not in questions, "Duplicate QA question")
            questions[row["question"]] = filename
    require((PACKAGE / "shopee_market_insights_qa.csv").read_bytes() == (BASE / "shopee_market_insights_qa.csv").read_bytes(), "Industry baseline bytes changed")
    sources = review["source_index"]
    require(len(sources) == 58, "Source index count mismatch")
    require({row["question"] for row in sources} == set(questions), "Orphan or missing source mapping")
    require(all(row["qa_file"] == questions[row["question"]] for row in sources), "Source QA file mismatch")
    qa_by_id = {row["qa_id"]: row for row in sources}
    require(len(qa_by_id) == 58, "Duplicate QA ID")
    catalog = {row["source_id"]: row for row in review["source_catalog"]}
    require(len(catalog) == 17 and len({row["url"] for row in catalog.values()}) == 17, "Source catalog mismatch")
    require(all(row["source_id"] in catalog and row["url"] == catalog[row["source_id"]]["url"] for row in sources), "Primary source URL mismatch")
    evidence = review["qa_evidence"]
    require(len(evidence) == 51, "Evidence count mismatch")
    require({row["qa_id"] for row in evidence} == {f"A{i:02}" for i in range(21, 51)}, "Missing new QA evidence")
    for row in evidence:
        require(row["qa_id"] in qa_by_id and row["question"] == qa_by_id[row["qa_id"]]["question"], "Evidence QA mismatch")
        require(row["source_id"] in catalog and row["url"] == catalog[row["source_id"]]["url"], "Evidence source mismatch")
    require(len(review["changes_and_revision_proposals"]) == 38 and len(review["coverage_audit"]) == 58, "Audit table count mismatch")
    tests = review["independent_evaluation"]
    require(len(tests) == 54 and len({row["test_id"] for row in tests}) == 54, "Evaluation count or IDs mismatch")
    require(all(row["actual_result"] == "未执行" and not row["retrieved_ids"] and not row["actual_answer"] for row in tests), "Unexecuted evaluation must not contain fabricated results")
    for row in tests:
        references = re.findall(r"[AM]\d{2}", row["updated_candidate_qa_ids"])
        require(all(ref in qa_by_id for ref in references), "Evaluation references an unknown QA")
    print("PASS: 58 QA (50 ads + 8 industry), original 28 preserved, 17 sources, 51 evidence mappings, 54 unexecuted evaluation queries. Static packaging checks only; no Dify retrieval test.")


if __name__ == "__main__":
    validate()
