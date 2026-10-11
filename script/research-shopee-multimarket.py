"""Read public official help pages; never accesses seller accounts or shop data.

Full temporary reading copies stay outside the repo. Reviewed facts, short
evidence excerpts and content hashes are maintained in the knowledge files.
"""
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import tempfile
import urllib.request
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")
CACHE = Path(tempfile.gettempdir()) / "yuehai-shopee-20261011"
PAGES = {
    "SG-R": ("help.shopee.sg", 77152),
    "MY-R": ("help.shopee.com.my", 77221),
    "MY-C": ("help.shopee.com.my", 78640),
    "PH-R": ("help.shopee.ph", 77279),
    "TH-R": ("help.shopee.co.th", 77253),
    "TH-T": ("help.shopee.co.th", 80427),
    "VN-R": ("help.shopee.vn", 77251),
    "VN-T": ("help.shopee.vn", 79314),
    "TW-T": ("help.shopee.tw", 80317),
    "TW-M": ("help.shopee.tw", 80079),
    "TW-R": ("help.shopee.tw", 79715),
    "TW-Q": ("help.shopee.tw", 79943),
    "BR-R": ("help.shopee.com.br", 77827),
    "BR-T": ("help.shopee.com.br", 76204),
    "MX-R": ("help.shopee.com.mx", 75926),
    "ID-R": ("help.shopee.co.id", 73503),
    "ID-T": ("help.shopee.co.id", 72909),
    "ID-Q": ("help.shopee.co.id", 73232),
    "MY-P": ("help.shopee.com.my", 77220),
    "PH-P": ("help.shopee.ph", 77276),
    "TW-P": ("help.shopee.tw", 77273),
    "SG-I": ("help.shopee.sg", 77213),
    "BR-I": ("help.shopee.com.br", 77326),
    "MY-F": ("help.shopee.com.my", 143248),
    "MY-A": ("help.shopee.com.my", 121770),
    "SG-A": ("help.shopee.sg", 185585),
    "PH-I": ("help.shopee.ph", 77270),
    "SG-P": ("help.shopee.sg", 77151),
    "VN-P": ("help.shopee.vn", 77247),
    "ID-P": ("help.shopee.co.id", 71189),
    "MX-P": ("help.shopee.com.mx", 75925),
    "TH-P": ("help.shopee.co.th", 80831),
    "TH-P2": ("help.shopee.co.th", 77249),
    "TH-C": ("help.shopee.co.th", 158620),
    "BR-C": ("help.shopee.com.br", 150027),
    "BR-S": ("help.shopee.com.br", 77113),
    "VN-E": ("help.shopee.vn", 190242),
    "VN-X": ("help.shopee.vn", 79465),
    "TW-N": ("help.shopee.tw", 80208),
    "SG-S": ("help.shopee.sg", 77148),
    "MY-S": ("help.shopee.com.my", 77215),
    "PH-S": ("help.shopee.ph", 77272),
    "MY-L": ("help.shopee.com.my", 163668),
}


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag in {"p", "div", "br", "tr", "li", "h1", "h2", "h3"}:
            self.parts.append("\n")
        if tag in {"td", "th"}:
            self.parts.append(" | ")
        if tag == "a" and dict(attrs).get("href"):
            self.links.append(dict(attrs)["href"])

    def handle_data(self, data):
        self.parts.append(data)


def fetch(item):
    source_id, (host, article_id) = item
    url = f"https://{host}/portal/4/article/{article_id}"
    record = {"source_id": source_id, "url": url}
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read()
        page = raw.decode("utf-8", errors="strict")
        state = json.JSONDecoder().raw_decode(page.split('window["FORGE_SSR_DATA_MAP"] = ', 1)[1])[0]
        article = next(v for v in state.values() if isinstance(v, dict) and v.get("content") and v.get("title"))
        parser = Text()
        parser.feed(article["content"])
        text = re.sub(r"\n\s*\n", "\n", "".join(parser.parts)).strip()
        record.update(title=article["title"], text=text, links=parser.links,
                      fetched_at=datetime.now(timezone.utc).isoformat(),
                      content_sha256=hashlib.sha256(article["content"].encode()).hexdigest())
    except (OSError, ValueError, IndexError, StopIteration) as error:
        record["error"] = str(error)
    return record


if __name__ == "__main__":
    unknown = set(sys.argv[1:]) - set(PAGES)
    if unknown:
        raise SystemExit("Unknown source IDs: " + ", ".join(sorted(unknown)))
    CACHE.mkdir(exist_ok=True)
    selected = {k: v for k, v in PAGES.items() if not sys.argv[1:] or k in sys.argv[1:]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(fetch, selected.items()))
    cache_file = CACHE / "official-pages.json"
    previous = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else []
    records = [r for r in previous if r["source_id"] not in selected] + records
    (CACHE / "official-pages.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    for record in (r for r in records if r["source_id"] in selected):
        print(json.dumps({k: record[k] for k in ("source_id", "title", "error", "links") if k in record and (k != "links" or record["source_id"].endswith("-I"))}, ensure_ascii=False))
    print("Reading copies:", CACHE)
