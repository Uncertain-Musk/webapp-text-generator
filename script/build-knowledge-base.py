"""Assemble reviewed research into CSV. Never edits the original or Dify."""
import argparse
import csv
import hashlib
import json
import shutil
from pathlib import Path

HEADERS = ["一级主题", "二级主题", "问题", "答案", "关键行动"]
SOURCE_HEADERS = ["source_id", "platform", "market", "topic", "source_title", "source_url", "official_domain", "page_date", "effective_date", "last_verified_date", "rows_supported", "notes"]
GAP_HEADERS = ["gap_id", "platform", "market", "topic", "user_query", "gap_type", "priority", "status", "official_source_candidate", "notes"]
TEST_HEADERS = ["test_id", "platform_context", "market_context", "topic", "query", "query_type", "expected_kb", "expected_policy_rows", "expected_behavior", "status"]
BASELINE_HASH = "534a5c9866ea602e46f99bf843e52768967eafc0f33572e6d7be60e82ea52088"


def write_csv(path, headers, records):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="raise", lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)


def build(root, original):
    if hashlib.sha256(original.read_bytes()).hexdigest() != BASELINE_HASH:
        raise ValueError("Original baseline hash changed; inspect manually before creating a copy")
    with original.open(encoding="utf-8-sig", newline="") as handle:
        matrix = list(csv.reader(handle, strict=True))
    if matrix[0] != HEADERS or len(matrix) != 501 or any(len(row) != 5 for row in matrix):
        raise ValueError("Original must contain the required header and 500 five-column data rows")
    kb = root / "knowledge-base"
    (kb / "general").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(original, kb / "general/yuehai_general_kb_v2.csv")
    research = [json.loads((kb / f"research/{name}.json").read_text(encoding="utf-8")) for name in ("amazon", "tiktok")]
    policy_rows, sources, gaps = [], [], []
    used_source_ids = set()
    manifest_rows = []
    for bundle in research:
        platform = bundle["platform"]
        source_map = {source["source_id"]: source for source in bundle["sources"]}
        support, topics = {}, {}
        for row in bundle["rows"]:
            sid = row["source_id"]
            if sid not in source_map:
                raise ValueError(f"Unknown source {sid}")
            pid = f"P{len(policy_rows) + 1:04d}"
            policy_rows.append(dict(zip(HEADERS, [f"{platform}｜美国站", row["topic"], row["question"], row["answer"], row["action"]])))
            support.setdefault(sid, []).append(pid)
            topics.setdefault(sid, set()).add(row["topic"])
            manifest_rows.append({"row_id": pid, "source_id": sid, "platform": platform, **row})
        for sid, pids in support.items():
            if sid in used_source_ids:
                raise ValueError(f"Duplicate source ID {sid}")
            used_source_ids.add(sid)
            source = source_map[sid]
            source_record = {key: source.get(key, "") or "" for key in SOURCE_HEADERS}
            source_record.update(platform=platform, market="US", rows_supported=";".join(pids), topic=";".join(sorted(topics[sid])))
            evidence = source.get("evidence_summary", "")
            if evidence:
                source_record["notes"] = f"{source_record['notes']}；核验要点：{evidence}".strip("；")
            sources.append(source_record)
        for gap in bundle.get("gaps", []):
            record = {key: gap.get(key, "") or "" for key in GAP_HEADERS}
            record.update(platform=platform, market="US")
            gaps.append(record)
    extras = kb / "research/evaluation-plan.json"
    plan = json.loads(extras.read_text(encoding="utf-8")) if extras.exists() else {"gaps": [], "tests": []}
    gaps.extend(plan.get("gaps", []))
    for index, gap in enumerate(gaps, 1):
        gap["gap_id"] = f"GAP-{index:03d}"
    write_csv(kb / "policy/yuehai_policy_kb_v1.csv", HEADERS, policy_rows)
    write_csv(kb / "policy/yuehai_policy_kb_v1_sources.csv", SOURCE_HEADERS, sources)
    write_csv(kb / "evaluation/yuehai_knowledge_gaps.csv", GAP_HEADERS, gaps)
    write_csv(kb / "evaluation/yuehai_policy_kb_v1_test_queries.csv", TEST_HEADERS, plan.get("tests", []))
    (kb / "research/policy-row-map.json").write_text(json.dumps(manifest_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"general_rows": 500, "policy_rows": len(policy_rows), "sources": len(sources), "gaps": len(gaps), "tests": len(plan.get("tests", [])), "original_sha256": BASELINE_HASH}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--original", type=Path, default=Path(r"C:\Users\zg105\Desktop\Codex生成文件\跨境电商高频问答500条.csv"))
    args = parser.parse_args()
    build(args.root.resolve(), args.original.resolve())
