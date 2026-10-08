#!/usr/bin/env python3
"""Read-only, standard-library validation for the Yuehai MVP0.3 CSV knowledge base.

Run from the repository root:
    python script/validate-knowledge-base.py --report-dir knowledge-base/reports

The only writes are the two reports, or the explicitly requested original audit.
No CSV is cleaned, reordered, overwritten, or repaired. Policy row IDs are 1-based
data rows (P0001 is the first record after the header). Similarity and answer
differences are review warnings, never evidence of a semantic conflict decision.
"""

from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import difflib
import hashlib
import io
import json
import pathlib
import re
import sys
import unicodedata
import urllib.parse


QA_HEADER = ["一级主题", "二级主题", "问题", "答案", "关键行动"]
SOURCE_HEADER = [
    "source_id", "platform", "market", "topic", "source_title", "source_url",
    "official_domain", "page_date", "effective_date", "last_verified_date",
    "rows_supported", "notes",
]
TEST_HEADER = [
    "test_id", "platform_context", "market_context", "topic", "query", "query_type",
    "expected_kb", "expected_policy_rows", "expected_behavior", "status",
]
GAP_HEADER = [
    "gap_id", "platform", "market", "topic", "user_query", "gap_type", "priority",
    "status", "official_source_candidate", "notes",
]
TOPICS = (
    "商品发布", "商品合规", "账号与违规", "申诉", "订单履约", "物流", "退款退货",
    "广告与经营", "费用与结算",
)
SCOPES = {"Amazon｜美国站": "Amazon", "TikTok Shop｜美国站": "TikTok Shop"}
OFFICIAL_HOSTS = {
    "Amazon": {"sell.amazon.com", "sellercentral.amazon.com", "advertising.amazon.com",
               "amazon.com", "www.amazon.com"},
    "TikTok Shop": {"seller-us.tiktok.com"},
}
DEFAULT_ORIGINAL = pathlib.Path(
    r"C:\Users\zg105\Desktop\Codex生成文件\跨境电商高频问答500条.csv"
)
AS_OF = dt.date(2026, 10, 2)
URL_RE = re.compile(r"https?://[^\s<>\"'，。；、（）【】《》]+", re.I)
HTML_RE = re.compile(r"</?[A-Za-z][^>]*>|<!DOCTYPE|&(?:nbsp|lt|gt|amp|quot|#\d+);", re.I)
MODEL_RE = re.compile(
    r"作为(?:一个|一名)?(?:AI|人工智能|语言模型)|as an (?:ai|language model)|"
    r"我(?:无法|不能)访问(?:互联网|网页)|我没有(?:实时|联网)|根据你提供的|以下是(?:生成|整理)的",
    re.I,
)
CONDITIONAL_RE = re.compile(r"通常|一般(?:情况下)?|可能|视情况|因(?:类目|账户|场景)而异|以(?:当前|最新).*为准")
OVERCLAIM_RE = re.compile(r"(?<!不)(?<!不能)保证通过|绝对安全|一定不会|永远不会|100\s*[%％]\s*(?:通过|安全|成功)")
MODEL_STYLE_RE = re.compile(r"根据我的知识|我认为|大概是|可能是")
MOJIBAKE_RE = re.compile(r"锟斤拷|ï»¿|Ã[\u0080-\u00ff]|Â[\u0080-\u00ff]|鏂囧|鐨勬")
ROW_ID_RE = re.compile(r"P\d{4}")


class Findings:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def add(self, severity, code, file, row_ids, message, **details):
        item = {"code": code, "file": str(file), "row_ids": list(row_ids), "message": message}
        if details:
            item["details"] = details
        getattr(self, severity).append(item)

    def error(self, code, file, row_ids, message, **details):
        self.add("errors", code, file, row_ids, message, **details)

    def warn(self, code, file, row_ids, message, **details):
        self.add("warnings", code, file, row_ids, message, **details)


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def load_csv(path, header, prefix, findings, optional=(), require_bom=True):
    """Decode strictly and retain record spans; an invalid row never becomes valid QA."""
    info = {"path": str(path), "prefix": prefix, "exists": path.is_file(), "header": [],
            "rows": [], "record_spans": [], "empty_values_by_column": {h: [] for h in header}}
    if not info["exists"]:
        findings.error("FILE_MISSING", path, [], "Required CSV file does not exist.")
        return info
    raw = path.read_bytes()
    info.update(sha256=sha256(raw), size_bytes=len(raw), utf8_bom=raw.startswith(b"\xef\xbb\xbf"))
    info["encoding"] = "utf-8-sig" if info["utf8_bom"] else "utf-8"
    if require_bom and not info["utf8_bom"]:
        findings.error("UTF8_BOM_REQUIRED", path, ["HEADER"], "CSV must use UTF-8 with BOM.")
    try:
        text = raw.decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError as exc:
        findings.error("INVALID_UTF8", path, [], "CSV does not decode as strict UTF-8.", offset=exc.start)
        return info
    info["physical_lines"] = len(text.splitlines())
    reader = csv.reader(io.StringIO(text, newline=""), strict=True)
    records = []
    previous_line = 0
    try:
        for index, row in enumerate(reader):
            row_id = f"{prefix}{index:04d}" if index else "HEADER"
            info["record_spans"].append({
                "record_index": index, "data_row_id": row_id, "start_line": previous_line + 1,
                "end_line": reader.line_num, "physical_line_count": reader.line_num - previous_line,
            })
            previous_line = reader.line_num
            records.append(row)
            if len(row) != len(header):
                findings.error("COLUMN_COUNT", path, [row_id], "Record column count differs from the required header.",
                               actual=len(row), required=len(header), physical_end_line=reader.line_num)
    except csv.Error as exc:
        findings.error("CSV_PARSE_ERROR", path, [], "Strict CSV parsing failed.",
                       physical_line=reader.line_num, parser_error=str(exc))
    info["csv_strict_parse"] = not any(f["file"] == str(path) and f["code"] == "CSV_PARSE_ERROR" for f in findings.errors)
    info["record_column_counts"] = {str(k): v for k, v in sorted(collections.Counter(map(len, records)).items())}
    info["header"] = records[0] if records else []
    info["rows"] = records[1:]
    info["data_rows"] = len(info["rows"])
    if info["header"] != header:
        findings.error("HEADER_MISMATCH", path, ["HEADER"], "Header must exactly match the required names and order.",
                       expected=header, actual=info["header"])
    for i, row in enumerate(info["rows"], 1):
        for column, name in enumerate(header):
            if column >= len(row) or not row[column].strip():
                row_id = f"{prefix}{i:04d}"
                info["empty_values_by_column"][name].append(row_id)
                if name not in optional:
                    findings.error("EMPTY_FIELD", path, [row_id], "Required field is empty.", column=name)
    info["multiline_records"] = [s for s in info["record_spans"] if s["physical_line_count"] > 1]
    return info


def valid_rows(info, length):
    return [(f"{info['prefix']}{i:04d}", row) for i, row in enumerate(info["rows"], 1) if len(row) == length]


def distribution(rows, columns):
    counts = collections.Counter(tuple(row[c] for c in columns) for row in rows if len(row) > max(columns))
    return [{"values": list(key), "count": count} for key, count in sorted(counts.items())]


def duplicates(info, column, label, findings):
    grouped = collections.defaultdict(list)
    for row_id, row in valid_rows(info, len(info["header"])):
        if column < len(row) and row[column].strip():
            grouped[row[column].strip()].append(row_id)
    result = [{"value": text, "row_ids": ids} for text, ids in grouped.items() if len(ids) > 1]
    for pair in result:
        findings.error("DUPLICATE_" + label.upper(), info["path"], pair["row_ids"],
                       f"Identical {label} occurs in more than one data row.", value=pair["value"])
    return result


def audit_original(info):
    rows = info["rows"]
    grouped = collections.defaultdict(list)
    answers = collections.defaultdict(list)
    for row_id, row in valid_rows(info, 5):
        grouped[row[2].strip()].append(row_id)
        answers[row[3].strip()].append(row_id)
    return {
        "original_path": info["path"], "read_only_original": True, "sha256": info.get("sha256"),
        "size_bytes": info.get("size_bytes"), "encoding": info.get("encoding"),
        "utf8_bom": info.get("utf8_bom", False), "csv_strict_parse": info.get("csv_strict_parse", False),
        "header": info["header"], "header_matches_required": info["header"] == QA_HEADER,
        "data_rows": len(rows), "record_column_counts": info.get("record_column_counts", {}),
        "rows_with_invalid_column_count": [s for s in info["record_spans"]
                                            if len(([info["header"]] + rows)[s["record_index"]]) != 5],
        "empty_values_by_column": info["empty_values_by_column"],
        "duplicate_questions": [{"question": text, "row_ids": ids} for text, ids in grouped.items() if len(ids) > 1],
        "duplicate_answers": [{"answer": text, "row_ids": ids} for text, ids in answers.items() if len(ids) > 1],
        "first_level_distribution": [{"topic": d["values"][0], "count": d["count"]} for d in distribution(rows, [0])],
        "second_level_distribution": [{"first_level": d["values"][0], "second_level": d["values"][1], "count": d["count"]}
                                      for d in distribution(rows, [0, 1])],
        "physical_lines": info.get("physical_lines", 0), "multiline_records": info.get("multiline_records", []),
        "questions": [{"row_id": row_id, "一级主题": r[0], "二级主题": r[1], "问题": r[2]}
                      for row_id, r in valid_rows(info, 5)],
    }


def urls(text):
    return [match.group(0).rstrip(".,;:!?)]}") for match in URL_RE.finditer(text)]


def url_check(url, platform=None):
    try:
        parsed = urllib.parse.urlsplit(url)
        host = (parsed.hostname or "").lower()
        port = parsed.port
    except ValueError:
        return False, "Malformed URL.", ""
    if parsed.scheme.lower() not in {"http", "https"} or not host:
        return False, "A complete http(s) URL is required.", host
    if parsed.username is not None or parsed.password is not None:
        return False, "URL user information is forbidden.", host
    if any(c.isspace() for c in url) or "\\" in url:
        return False, "Whitespace or backslash is forbidden in URLs.", host
    if port not in (None, 80 if parsed.scheme.lower() == "http" else 443):
        return False, "Only the default http(s) port is allowed.", host
    if platform is not None and host not in OFFICIAL_HOSTS.get(platform, set()):
        return False, "URL hostname is outside the platform's exact official allowlist.", host
    return True, "", host


def canonical_url(url):
    try:
        parsed = urllib.parse.urlsplit(url)
    except ValueError:
        # A malformed citation is already an error; it must not prevent reporting.
        return url
    return urllib.parse.urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path, parsed.query, ""))


def check_date(value, findings, file, row_ids, label, as_of):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        findings.error("INVALID_DATE", file, row_ids, "Date must use YYYY-MM-DD.", field=label, value=value)
        return
    try:
        date = dt.date.fromisoformat(value)
    except ValueError:
        findings.error("INVALID_DATE", file, row_ids, "Date is not a valid calendar date.", field=label, value=value)
        return
    if date > as_of:
        findings.error("DATE_AFTER_AS_OF", file, row_ids, "Date is later than the fixed audit cutoff.",
                       field=label, value=value, as_of=as_of.isoformat())


def check_text(info, findings):
    for row_id, row in valid_rows(info, 5):
        for name, value in zip(QA_HEADER, row):
            if "\ufffd" in value or any(ord(c) < 32 and c not in "\r\n\t" for c in value) or "\ufeff" in value:
                findings.error("ENCODING_OR_CONTROL_RESIDUE", info["path"], [row_id],
                               "Replacement characters, internal BOM, or forbidden control characters were found.", column=name)
            if HTML_RE.search(value):
                findings.error("HTML_RESIDUE", info["path"], [row_id], "HTML tags or escaped page markup were found.", column=name)
            if MOJIBAKE_RE.search(value):
                findings.warn("POSSIBLE_MOJIBAKE", info["path"], [row_id], "Review a possible encoding artifact.", column=name)
        if MODEL_RE.search(row[3]):
            findings.error("MODEL_RESIDUE", info["path"], [row_id], "Answer contains model or draft-generation language.")
        if MODEL_STYLE_RE.search(row[3]):
            findings.warn("MODEL_STYLE_REVIEW", info["path"], [row_id], "Review model-style phrasing; conditional policy wording must not be automatically rejected.")
        conditional = sorted(set(CONDITIONAL_RE.findall(row[3])))
        if conditional:
            findings.warn("CONDITIONAL_LANGUAGE_REVIEW", info["path"], [row_id],
                          "Review whether the answer states conditions and applicability clearly.", terms=conditional)
        if OVERCLAIM_RE.search(row[3]):
            findings.warn("UNCONDITIONAL_CLAIM_REVIEW", info["path"], [row_id],
                          "Review an absolute promise that may overstate the cited rule.")


def normalized_question(question):
    value = unicodedata.normalize("NFKC", question).lower()
    value = re.sub(r"tiktok\s*shop|amazon|亚马逊|美国站|美国市场|美站|us\s*(?:market|site)", "", value)
    return "".join(c for c in value if c.isalnum())


def bigrams(value):
    return {value[i:i + 2] for i in range(len(value) - 1)}


def answer_signature(answer):
    body = re.split(r"官方来源|官方页面|最后核验", answer, maxsplit=1)[0]
    body = URL_RE.sub("", body)
    body = re.sub(r"(?m)^\s*\d+[.)、]\s*", "", body)
    return {
        "numbers_times_percentages": sorted(set(
            re.findall(r"\d+(?:\.\d+)?\s*(?:%|％|工作日|自然日|天|日|小时|分钟|字符|美元|USD|\$)?", body)
            + re.findall(r"[零〇一二两三四五六七八九十百千万]+(?:个)?(?:工作日|自然日|天|日|小时|分钟|美元)", body))),
        "responsibility_phrases": sorted(set(re.findall(
            r"(?:由[^。；;，,]{1,25}承担|[^。；;，,]{1,25}负责|归责[^。；;，,]{0,25}|"
            r"(?:平台|卖家|买家|客户|Amazon|TikTok(?: Shop)?|承运商)[^。；;，,]{0,15}(?:承担|负责))", body))),
    }


def similarity_scan(info, findings, policy=False):
    groups = collections.defaultdict(list)
    for row_id, row in valid_rows(info, 5):
        groups[(row[0], row[1])].append((row_id, row, normalized_question(row[2])))
    risks, conflicts = [], []
    for (scope, topic), group in groups.items():
        for index, (left_id, left_row, left) in enumerate(group):
            for right_id, right_row, right in group[index + 1:]:
                if not left or not right or (not policy and left_row[2].strip() == right_row[2].strip()):
                    continue
                # Length bound is only an optimization; the two actual thresholds remain decisive.
                if min(len(left), len(right)) / max(len(left), len(right)) < 0.7:
                    continue
                sequence = difflib.SequenceMatcher(None, left, right, autojunk=False).ratio()
                if sequence < 0.84:
                    continue
                a, b = bigrams(left), bigrams(right)
                jaccard = len(a & b) / len(a | b) if a | b else 1.0
                if jaccard < 0.6:
                    continue
                risk = {"file": info["path"], "row_ids": [left_id, right_id], "scope": scope, "topic": topic,
                        "questions": [left_row[2], right_row[2]], "normalized_core_queries": [left, right],
                        "sequence_matcher": round(sequence, 6), "char2gram_jaccard": round(jaccard, 6),
                        "review_status": "manual_review_required"}
                risks.append(risk)
                findings.warn("HIGHLY_SIMILAR_QUESTION", info["path"], risk["row_ids"],
                              "Questions meet both similarity thresholds; review their intent and answers.",
                              sequence_matcher=risk["sequence_matcher"], char2gram_jaccard=risk["char2gram_jaccard"], topic=topic)
                if policy:
                    signatures = [answer_signature(left_row[3]), answer_signature(right_row[3])]
                    if signatures[0] != signatures[1]:
                        conflict = dict(risk, answer_signatures=signatures,
                                        reason="Numbers, deadlines, percentages, or responsibility wording differ.",
                                        semantic_conflict_confirmed=False)
                        conflicts.append(conflict)
                        findings.warn("POTENTIAL_ANSWER_CONFLICT", info["path"], risk["row_ids"],
                                      "Review differing answer facts for highly similar questions in the same platform, market, and topic.",
                                      signatures=signatures, semantic_conflict_confirmed=False)
    return risks, conflicts


def parse_row_ids(value, findings, file, row_ids, label):
    values = value.split(";") if value else []
    if not values or any(not ROW_ID_RE.fullmatch(v) for v in values):
        findings.error("ROW_ID_FORMAT", file, row_ids, "Policy references must use semicolon-separated P0001-style data row IDs.",
                       field=label, value=value)
        return []
    if len(values) != len(set(values)):
        findings.error("ROW_ID_DUPLICATE", file, row_ids, "A policy row ID occurs more than once in the same reference field.", field=label)
    return values


def validate(kb_dir, original_path, as_of=AS_OF):
    findings = Findings()
    original = load_csv(original_path, QA_HEADER, "G", findings)
    general = load_csv(kb_dir / "general/yuehai_general_kb_v2.csv", QA_HEADER, "G", findings)
    policy = load_csv(kb_dir / "policy/yuehai_policy_kb_v1.csv", QA_HEADER, "P", findings)
    sources = load_csv(kb_dir / "policy/yuehai_policy_kb_v1_sources.csv", SOURCE_HEADER, "S", findings,
                       optional=("page_date", "effective_date"))
    tests = load_csv(kb_dir / "evaluation/yuehai_policy_kb_v1_test_queries.csv", TEST_HEADER, "T", findings,
                     optional=("platform_context", "market_context", "expected_policy_rows"))
    gaps = load_csv(kb_dir / "evaluation/yuehai_knowledge_gaps.csv", GAP_HEADER, "GAP", findings,
                    optional=("platform", "market", "official_source_candidate"))
    audit = audit_original(original)
    for info in (original, general):
        if len(info["rows"]) != 500:
            findings.error("GENERAL_ROW_COUNT", info["path"], [], "General KB and its original must each contain exactly 500 data rows.", actual=len(info["rows"]))
    equal = original["header"] == general["header"] and original["rows"] == general["rows"]
    differences = []
    for i in range(max(len(original["rows"]), len(general["rows"]))):
        old = original["rows"][i] if i < len(original["rows"]) else None
        new = general["rows"][i] if i < len(general["rows"]) else None
        if old != new:
            differences.append({"row_id": f"G{i + 1:04d}", "original": old, "copy": new})
    if not equal:
        findings.error("GENERAL_MATRIX_MISMATCH", general["path"], [d["row_id"] for d in differences],
                       "General copy differs from the original parsed matrix; no alteration is permitted.",
                       header_equal=original["header"] == general["header"], differing_data_rows=len(differences))
    similarity_risks, conflicts = [], []
    for info in (general, policy):
        info["first_level_distribution"] = distribution(info["rows"], [0])
        info["second_level_distribution"] = distribution(info["rows"], [0, 1])
        info["duplicate_questions"] = duplicates(info, 2, "question", findings)
        info["duplicate_answers"] = duplicates(info, 3, "answer", findings)
        check_text(info, findings)
        risks, potential = similarity_scan(info, findings, policy=info is policy)
        similarity_risks.extend(risks)
        conflicts.extend(potential)
    policy_rows = dict(valid_rows(policy, 5))
    policy_urls = {}
    for row_id, row in policy_rows.items():
        platform = SCOPES.get(row[0])
        if not platform:
            findings.error("POLICY_SCOPE", policy["path"], [row_id], "Policy scope must be Amazon｜美国站 or TikTok Shop｜美国站.", value=row[0])
        if row[1] not in TOPICS:
            findings.error("POLICY_TOPIC", policy["path"], [row_id], "Policy topic is outside the nine controlled topics.", value=row[1])
        if platform and (platform.lower() not in row[2].lower() or "美国站" not in row[2]):
            findings.error("POLICY_QUESTION_CONTEXT", policy["path"], [row_id], "Question must explicitly include its platform name and 美国站.")
        for label in ("官方来源", "官方页面", "最后核验"):
            if not re.search(re.escape(label) + r"\s*[：:]", row[3]):
                findings.error("POLICY_SOURCE_LABEL", policy["path"], [row_id], "Answer is missing required source metadata.", missing=label)
        dates = re.findall(r"最后核验(?:日期)?\s*[：:]?\s*([^\s，。；;]+)", row[3])
        if not dates:
            findings.error("INVALID_DATE", policy["path"], [row_id], "A last-verified date is required in the answer.", field="最后核验")
        for date in dates:
            check_date(date, findings, policy["path"], [row_id], "最后核验", as_of)
        extracted = urls(row[3])
        policy_urls[row_id] = extracted
        if not extracted:
            findings.error("POLICY_URL_MISSING", policy["path"], [row_id], "Answer must contain an official http(s) page URL.")
        for url in extracted:
            ok, reason, host = url_check(url, platform or "INVALID_SCOPE")
            if not ok:
                findings.error("URL_NOT_ALLOWED", policy["path"], [row_id], reason, url=url, hostname=host)
    source_entries = []
    source_map = collections.defaultdict(list)
    source_ids = collections.defaultdict(list)
    for source_row_id, row in valid_rows(sources, len(SOURCE_HEADER)):
        entry = dict(zip(SOURCE_HEADER, row))
        source_ids[entry["source_id"]].append(source_row_id)
        platform = entry["platform"]
        topics = re.split(r"[;；]", entry["topic"])
        if platform not in OFFICIAL_HOSTS or entry["market"] not in {"US", "美国站"}:
            findings.error("SOURCE_SCOPE", sources["path"], [source_row_id], "Audited policy sources must use an allowed platform and US market.")
        if any(topic not in TOPICS for topic in topics):
            findings.error("SOURCE_TOPIC", sources["path"], [source_row_id], "Source topic references an uncontrolled topic.", topics=topics)
        ok, reason, host = url_check(entry["source_url"], platform)
        if not ok:
            findings.error("URL_NOT_ALLOWED", sources["path"], [source_row_id], reason, url=entry["source_url"], hostname=host)
        if entry["official_domain"].lower() != host:
            findings.error("OFFICIAL_DOMAIN_MISMATCH", sources["path"], [source_row_id], "official_domain must equal the parsed source URL hostname.", hostname=host)
        for field in ("page_date", "effective_date", "last_verified_date"):
            if entry[field]:
                check_date(entry[field], findings, sources["path"], [source_row_id], field, as_of)
        if (not entry["page_date"] or not entry["effective_date"]) and not re.search(r"未|无|不适用|未注明|unknown|not (?:stated|specified)|no (?:date|publication)", entry["notes"], re.I):
            findings.warn("MISSING_SOURCE_DATE_CONTEXT", sources["path"], [source_row_id], "Explain unprovided publication or effective dates in notes.")
        supported = parse_row_ids(entry["rows_supported"], findings, sources["path"], [source_row_id], "rows_supported")
        entry["parsed_rows_supported"] = supported
        source_entries.append(entry)
        for row_id in supported:
            if row_id not in policy_rows:
                findings.error("UNKNOWN_POLICY_ROW", sources["path"], [source_row_id, row_id], "Source audit references a nonexistent policy data row.")
                continue
            qa = policy_rows[row_id]
            matches_url = any(canonical_url(url) == canonical_url(entry["source_url"]) for url in policy_urls[row_id])
            if qa[0] != platform + "｜美国站" or qa[1] not in topics or not matches_url:
                findings.error("SOURCE_ROW_MAPPING", sources["path"], [source_row_id, row_id], "Source row mapping must match the QA platform, market, topic, and cited URL.", source_id=entry["source_id"])
            else:
                source_map[row_id].append(entry["source_id"])
    for source_id, ids in source_ids.items():
        if len(ids) > 1:
            findings.error("DUPLICATE_SOURCE_ID", sources["path"], ids, "source_id must be unique.", source_id=source_id)
    for row_id, cited_urls in policy_urls.items():
        for url in cited_urls:
            covering = [entry["source_id"] for entry in source_entries
                        if row_id in entry["parsed_rows_supported"]
                        and entry["source_id"] in source_map[row_id]
                        and canonical_url(entry["source_url"]) == canonical_url(url)]
            if not covering:
                findings.error("POLICY_SOURCE_UNMAPPED", policy["path"], [row_id], "Each answer URL must be covered by a correct source-audit row mapping.", url=url)
    if len(tests["rows"]) < 40:
        findings.error("TEST_COUNT", tests["path"], [], "Evaluation set must contain at least 40 test queries.", actual=len(tests["rows"]))
    test_ids = collections.defaultdict(list)
    for record_id, row in valid_rows(tests, len(TEST_HEADER)):
        entry = dict(zip(TEST_HEADER, row))
        test_ids[entry["test_id"]].append(record_id)
        kb = entry["expected_kb"]
        if kb not in {"General KB", "Policy KB", "Expected Gap"}:
            findings.error("EXPECTED_KB_VALUE", tests["path"], [entry["test_id"]], "expected_kb must be General KB, Policy KB, or Expected Gap.", value=kb)
        if kb == "Policy KB":
            references = parse_row_ids(entry["expected_policy_rows"], findings, tests["path"], [entry["test_id"]], "expected_policy_rows")
            if not references:
                findings.error("TEST_POLICY_ROWS", tests["path"], [entry["test_id"]], "Policy KB tests require policy data-row references.")
            for row_id in references:
                qa = policy_rows.get(row_id)
                explicit_platforms = [p for p in ("Amazon", "TikTok Shop") if p.lower() in entry["query"].lower()]
                resolved_platform = explicit_platforms[0] if len(explicit_platforms) == 1 else entry["platform_context"]
                resolved_market = "US" if "美国站" in entry["query"] else entry["market_context"]
                if (not qa or resolved_market not in {"US", "美国站"}
                        or qa[0] != resolved_platform + "｜美国站" or qa[1] != entry["topic"]):
                    findings.error("TEST_POLICY_ROWS", tests["path"], [entry["test_id"], row_id], "Expected policy rows must match the query's explicit scope or its context, and the topic.")
        elif entry["expected_policy_rows"]:
            findings.error("TEST_POLICY_ROWS", tests["path"], [entry["test_id"]], "General KB and Expected Gap tests must leave expected_policy_rows empty.")
    for test_id, ids in test_ids.items():
        if len(ids) > 1:
            findings.error("DUPLICATE_TEST_ID", tests["path"], ids, "test_id must be unique.", test_id=test_id)
    gap_ids = collections.defaultdict(list)
    for record_id, row in valid_rows(gaps, len(GAP_HEADER)):
        entry = dict(zip(GAP_HEADER, row))
        gap_ids[entry["gap_id"]].append(record_id)
        if entry["official_source_candidate"]:
            candidates = urls(entry["official_source_candidate"])
            if not candidates:
                findings.error("GAP_CANDIDATE_URL", gaps["path"], [entry["gap_id"]], "A nonempty official-source candidate must include an http(s) URL.")
            for candidate in candidates:
                ok, reason, _ = url_check(candidate, entry["platform"] if entry["platform"] in OFFICIAL_HOSTS else None)
                # Ads Help is a research candidate only, not an imported Policy source.
                if not ok and entry["platform"] == "TikTok Shop":
                    structural_ok, _, host = url_check(candidate)
                    ok = structural_ok and host == "ads.tiktok.com"
                if not ok:
                    findings.error("GAP_CANDIDATE_URL", gaps["path"], [entry["gap_id"]], reason, url=candidate)
    for gap_id, ids in gap_ids.items():
        if len(ids) > 1:
            findings.error("DUPLICATE_GAP_ID", gaps["path"], ids, "gap_id must be unique.", gap_id=gap_id)
    unchanged = original_path.is_file() and sha256(original_path.read_bytes()) == original.get("sha256")
    if not unchanged:
        findings.error("ORIGINAL_CHANGED_DURING_RUN", original_path, [], "Original content changed between the read-only checks.")
    all_files = {"original": original, "general": general, "policy": policy, "sources": sources, "test_queries": tests, "gaps": gaps}
    return {
        "schema_version": "1.0", "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "as_of": as_of.isoformat(),
        "summary": {"status": "failed" if findings.errors else "passed_with_warnings" if findings.warnings else "passed",
                    "errors": len(findings.errors), "warnings": len(findings.warnings),
                    "row_counts": {key: len(info["rows"]) for key, info in all_files.items()},
                    "source_count": len(source_entries), "unique_source_urls": len({entry["source_url"] for entry in source_entries}),
                    "mapped_policy_rows": len([ids for ids in source_map.values() if ids]),
                    "highly_similar_question_pairs": len(similarity_risks), "potential_answer_conflict_pairs": len(conflicts),
                    "original_unchanged_during_validation": unchanged},
        "constraints": {"controlled_policy_topics": list(TOPICS), "policy_scopes": list(SCOPES),
                        "official_hostname_allowlist": {key: sorted(value) for key, value in OFFICIAL_HOSTS.items()},
                        "similarity_thresholds": {"sequence_matcher": 0.84, "char2gram_jaccard": 0.6}},
        "limitations": ["Local validation does not fetch official pages or independently verify the asserted last-verified dates.",
                        "Similarity and answer signatures identify review candidates; zero candidates does not prove zero semantic conflicts.",
                        "CSV evaluation rows are test cases; this script does not execute Dify retrieval or score live answers."],
        "original_audit": audit,
        "general_fidelity": {"parsed_matrix_equal": equal, "header_equal": original["header"] == general["header"],
                             "byte_identical": original.get("sha256") == general.get("sha256"), "differences": differences},
        "files": {key: {k: v for k, v in info.items() if k != "rows"} for key, info in all_files.items()},
        "policy_source_map": {row_id: sorted(set(source_map[row_id])) for row_id in policy_rows},
        "source_entries": source_entries,
        "test_distributions": {"expected_kb": distribution(tests["rows"], [6]), "query_type": distribution(tests["rows"], [5]),
                               "platform_market": distribution(tests["rows"], [1, 2]), "topic": distribution(tests["rows"], [3]),
                               "status": distribution(tests["rows"], [9])},
        "gap_distributions": {"platform_market": distribution(gaps["rows"], [1, 2]), "topic": distribution(gaps["rows"], [3]),
                              "type": distribution(gaps["rows"], [5]), "status": distribution(gaps["rows"], [7])},
        "similarity_risks": similarity_risks, "potential_answer_conflicts": conflicts,
        "errors": findings.errors, "warnings": findings.warnings,
    }


def md_escape(value):
    return str(value).replace("|", "\\|").replace("\r", " ").replace("\n", "<br>")


def markdown_report(report):
    summary = report["summary"]
    out = ["# Yuehai knowledge-base validation", "", f"Audit cutoff: {report['as_of']}", "",
           f"Status: **{summary['status']}**. Errors: {summary['errors']}; warnings: {summary['warnings']}.", "",
           "## Scope and limits", ""]
    out.extend("- " + text for text in report["limitations"])
    out += ["", "No input CSV was written or cleaned. Row IDs refer to 1-based data rows, excluding the header.", "",
            "## File statistics", "", "| File | Data rows | UTF-8 BOM | Bytes | Multiline records |", "|---|---:|---|---:|---:|"]
    for key, info in report["files"].items():
        out.append(f"| {key} | {info.get('data_rows', 0)} | {info.get('utf8_bom', False)} | {info.get('size_bytes', 0)} | {len(info.get('multiline_records', []))} |")
    out += ["", "## Original and General fidelity", "", f"Original SHA256: `{report['original_audit']['sha256']}`", "",
            f"Parsed matrices equal: **{report['general_fidelity']['parsed_matrix_equal']}**; byte identical: **{report['general_fidelity']['byte_identical']}**.", "",
            f"Original unchanged during validation: **{summary['original_unchanged_during_validation']}**.", ""]
    for key in ("original", "general", "policy"):
        info = report["files"][key]
        out += [f"## {key.title()} topic distribution", "", "| First level | Second level | Rows |", "|---|---|---:|"]
        distribution_rows = (report["original_audit"]["second_level_distribution"] if key == "original" else info.get("second_level_distribution", []))
        for row in distribution_rows:
            values = [row["first_level"], row["second_level"]] if key == "original" else row["values"]
            out.append("| " + " | ".join(md_escape(v) for v in values) + f" | {row['count']} |")
        out += ["", "| Column | Empty values | Row IDs |", "|---|---:|---|"]
        for column, ids in info["empty_values_by_column"].items():
            out.append(f"| {md_escape(column)} | {len(ids)} | {', '.join(ids)} |")
        out += [""]
    out += ["## Source audit coverage", "", f"Source rows: **{summary['source_count']}**; unique source URLs: **{summary['unique_source_urls']}**; mapped policy rows: **{summary['mapped_policy_rows']}**.", "",
            "| Source ID | Platform / market | Topic | Source URL | Supported policy row IDs | Last verified |", "|---|---|---|---|---|---|"]
    for entry in report["source_entries"]:
        out.append("| " + " | ".join(md_escape(v) for v in [entry["source_id"], entry["platform"] + " / " + entry["market"],
                    entry["topic"], entry["source_url"], entry["rows_supported"], entry["last_verified_date"]]) + " |")
    for group, distributions in (("Evaluation", report["test_distributions"]), ("Knowledge gaps", report["gap_distributions"])):
        out += ["", f"## {group} distributions", "", "| Dimension | Values | Rows |", "|---|---|---:|"]
        for dimension, rows in distributions.items():
            for row in rows:
                out.append(f"| {dimension} | {md_escape(' / '.join(row['values']))} | {row['count']} |")
    out += ["", "## Highly similar questions", "",
            "Both thresholds must hold after platform and market words are removed: SequenceMatcher ≥ 0.84 and character bigram Jaccard ≥ 0.60. Candidates require manual review.", "",
            "| File | Row IDs | Topic | SequenceMatcher | Bigram Jaccard | Questions |", "|---|---|---|---:|---:|---|"]
    for risk in report["similarity_risks"]:
        out.append("| " + " | ".join(md_escape(v) for v in [pathlib.Path(risk["file"]).name, ";".join(risk["row_ids"]),
                    risk["topic"], risk["sequence_matcher"], risk["char2gram_jaccard"], " / ".join(risk["questions"])]) + " |")
    out += ["", "## Potential answer differences", "",
            f"Manual-review candidates: **{len(report['potential_answer_conflicts'])}**. This count does not establish whether semantic conflicts exist.", "",
            "| Row IDs | Topic | Answer signatures |", "|---|---|---|"]
    for conflict in report["potential_answer_conflicts"]:
        out.append("| " + " | ".join(md_escape(v) for v in [";".join(conflict["row_ids"]), conflict["topic"],
                    json.dumps(conflict["answer_signatures"], ensure_ascii=False)]) + " |")
    for severity in ("errors", "warnings"):
        out += ["", f"## {severity.title()} ({len(report[severity])})", "", "| Code | File | Row IDs | Finding | Details |", "|---|---|---|---|---|"]
        for finding in report[severity]:
            out.append("| " + " | ".join(md_escape(v) for v in [finding["code"], pathlib.Path(finding["file"]).name,
                        ";".join(finding["row_ids"]), finding["message"], json.dumps(finding.get("details", {}), ensure_ascii=False)]) + " |")
    return "\n".join(out) + "\n"


def safe_write(path, text, input_paths):
    if path.resolve() in {p.resolve() for p in input_paths}:
        raise ValueError("Output path must not overwrite an input CSV.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    repo = pathlib.Path(__file__).resolve().parents[1]
    parser.add_argument("--kb-dir", type=pathlib.Path, default=repo / "knowledge-base")
    parser.add_argument("--original", type=pathlib.Path, default=DEFAULT_ORIGINAL)
    parser.add_argument("--report-dir", type=pathlib.Path, default=repo / "knowledge-base/reports")
    parser.add_argument("--as-of", type=dt.date.fromisoformat, default=AS_OF,
                        help="Audit cutoff in YYYY-MM-DD; default is the current release's verification date.")
    parser.add_argument("--audit-only", action="store_true", help="Only audit the original CSV; do not validate the not-yet-built knowledge base.")
    parser.add_argument("--audit-output", type=pathlib.Path, help="Original-audit JSON output; defaults to knowledge-base/research/general-audit.json in audit-only mode.")
    args = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if args.audit_only:
        findings = Findings()
        info = load_csv(args.original, QA_HEADER, "G", findings)
        audit = audit_original(info)
        if len(info["rows"]) != 500:
            findings.error("GENERAL_ROW_COUNT", args.original, [], "Original must contain exactly 500 data rows.", actual=len(info["rows"]))
        audit["errors"] = findings.errors
        audit["warnings"] = findings.warnings
        out = args.audit_output or args.kb_dir / "research/general-audit.json"
        safe_write(out, json.dumps(audit, ensure_ascii=False, indent=2) + "\n", [args.original])
        print(json.dumps({"audit": str(out), "sha256": audit["sha256"], "rows": audit["data_rows"], "errors": len(findings.errors)}, ensure_ascii=False))
        return 1 if findings.errors else 0
    report = validate(args.kb_dir, args.original, as_of=args.as_of)
    inputs = [args.original] + [pathlib.Path(info["path"]) for info in report["files"].values()]
    json_path = args.report_dir / "validation-report.json"
    md_path = args.report_dir / "validation-report.md"
    safe_write(json_path, json.dumps(report, ensure_ascii=False, indent=2) + "\n", inputs)
    safe_write(md_path, markdown_report(report), inputs)
    print(json.dumps({**report["summary"], "json_report": str(json_path), "markdown_report": str(md_path)}, ensure_ascii=False))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
