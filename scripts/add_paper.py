#!/usr/bin/env python3
"""Turn a "New paper" issue into hugo/content/papers/<date>-<slug>.md.

Reads the issue body (GitHub issue form) from the ISSUE_BODY environment variable, fetches title,
authors and date for arXiv, IACR ePrint and DOI links, and prints the path of the new file.
Standard library only.
"""
import datetime, html, json, os, re, sys, unicodedata, urllib.request, xml.etree.ElementTree as ET

UA = {"User-Agent": "zkbr-papers/1.0 (+https://zkbr.github.io)"}

def get(url, accept=None):
    req = urllib.request.Request(url, headers={**UA, **({"Accept": accept} if accept else {})})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")

def form_fields(body):
    """### Label\n\nvalue  ->  {label: value}; '_No response_' counts as empty."""
    out = {}
    for m in re.finditer(r"^### (.+?)\s*\n(.*?)(?=^### |\Z)", body or "", re.S | re.M):
        v = m.group(2).strip()
        out[m.group(1).strip().lower().split(" (")[0]] = "" if v == "_No response_" else v
    return out

def clean(s):
    return re.sub(r"\s+", " ", html.unescape(s or "")).strip()

def from_arxiv(url):
    m = re.search(r"arxiv\.org/(?:abs|pdf|html)/([^\s?#]+?)(?:v\d+)?(?:\.pdf)?(?:[?#]|$)", url)
    if not m:
        return None
    xml = get("https://export.arxiv.org/api/query?id_list=" + m.group(1))
    ns = {"a": "http://www.w3.org/2005/Atom"}
    e = ET.fromstring(xml).find("a:entry", ns)
    if e is None or e.find("a:title", ns) is None:
        return None
    return {"title": clean(e.find("a:title", ns).text), "authors": [clean(a.find("a:name", ns).text) for a in e.findall("a:author", ns)],
            "date": (e.find("a:published", ns).text or "")[:10], "venue": "arXiv", "link": "https://arxiv.org/abs/" + m.group(1)}

def meta(page, name):
    return [clean(v) for v in re.findall(r'<meta\s+(?:name|property)="%s"\s+content="([^"]*)"' % re.escape(name), page)] + \
           [clean(v) for v in re.findall(r'<meta\s+content="([^"]*)"\s+(?:name|property)="%s"' % re.escape(name), page)]

def from_page(url):
    """IACR ePrint and most publisher pages carry Highwire citation_* tags."""
    page = get(url)
    title = (meta(page, "citation_title") or meta(page, "og:title") or [clean(re.sub(r"<[^>]+>", "", (re.search(r"<title>(.*?)</title>", page, re.S) or [None, ""])[1]))])[0]
    date = (meta(page, "citation_publication_date") or meta(page, "citation_date") or meta(page, "citation_online_date") or [""])[0].replace("/", "-")[:10]
    venue = "IACR ePrint" if "eprint.iacr.org" in url else (meta(page, "citation_conference_title") or meta(page, "citation_journal_title") or [""])[0]
    return {"title": title, "authors": meta(page, "citation_author"), "date": date, "venue": venue, "link": url}

def from_doi(url):
    m = re.search(r"(10\.\d{4,9}/[^\s?#]+)", url)
    if not m:
        return None
    d = json.loads(get("https://api.crossref.org/works/" + m.group(1)))["message"]
    parts = (d.get("published") or d.get("issued") or {}).get("date-parts", [[]])[0]
    return {"title": clean((d.get("title") or [""])[0]), "authors": [clean(f"{a.get('given', '')} {a.get('family', '')}") for a in d.get("author", [])],
            "date": "-".join(f"{p:02d}" for p in parts), "venue": clean((d.get("container-title") or [""])[0]), "link": "https://doi.org/" + m.group(1)}

def lookup(url):
    for f in (from_arxiv, from_doi if "doi.org/" in url or url.startswith("10.") else None, from_page):
        if f is None:
            continue
        try:
            r = f(url)
            if r and r.get("title"):
                return r
        except Exception as e:  # network or parse problem: try the next way, then fall back to the form
            print(f"lookup {f.__name__}: {e}", file=sys.stderr)
    return {"title": "", "authors": [], "date": "", "venue": "", "link": url}

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60] or "paper"

def yq(s):
    return json.dumps(s, ensure_ascii=False)  # a JSON string is a valid YAML string

def build(fields, info, today):
    link = fields.get("link", "").strip()
    title = fields.get("title") or info["title"]
    if not link or not title:
        raise SystemExit("The link is missing, or no title could be found: fill in the title in the form.")
    authors = [a.strip() for a in fields["authors"].split(",")] if fields.get("authors") else info["authors"]
    tags = [t.strip() for t in fields.get("tags", "").split(",") if t.strip()]
    fm = ["---", f"title: {yq(title)}", f"date: {today}", f"link: {yq(info.get('link') or link)}",
          f"authors: [{', '.join(yq(a) for a in authors if a)}]", f"venue: {yq(fields.get('venue') or info['venue'])}",
          f"paperDate: {yq(info['date'])}", f"tags: [{', '.join(yq(t) for t in tags)}]", "---", ""]
    return f"{today}-{slug(title)}.md", "\n".join(fm) + fields.get("comment", "").strip() + "\n"

if __name__ == "__main__":
    fields = form_fields(os.environ.get("ISSUE_BODY", ""))
    today = datetime.date.today().isoformat()
    name, text = build(fields, lookup(fields.get("link", "").strip()), today)
    path = os.path.join(os.path.dirname(__file__), "..", "hugo", "content", "papers", name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(os.path.relpath(path, os.path.join(os.path.dirname(__file__), "..")))
