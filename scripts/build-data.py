#!/usr/bin/env python3
"""
Epochlight data pipeline.

Fetches raw JSON data from the epochlight-data GitHub repo, transforms it into
a single optimized JSON file for the web app.

Uses a local cache (.data-cache/) to skip rebuilds when data hasn't changed.
The cache is keyed on the data_hash from the remote manifest.json.
"""

import hashlib
import json
import math
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent
CACHE_DIR = APP_DIR / ".data-cache"
OUTPUT_FILE = APP_DIR / "public" / "data" / "epochlight-data.json"

# GitHub raw content base URL (public repo, no auth needed)
GITHUB_OWNER = "gelileo"
GITHUB_REPO = "epochlight-data"
GITHUB_BRANCH = "main"
GITHUB_RAW_BASE = f"https://raw.githubusercontent.com/{GITHUB_OWNER}/{GITHUB_REPO}/{GITHUB_BRANCH}/data"

# For local development: if epochlight-data is a sibling directory, use it
LOCAL_DATA_DIR = APP_DIR.parent / "epochlight-data" / "data"

SUBJECT_FILES = [
    "mathematics.json",
    "physics.json",
    "chemistry.json",
    "medicine-biology.json",
    "inventions-engineering.json",
    "astronomy-cosmology.json",
    "philosophy-logic.json",
    "world-history.json",
]

DATA_FILES = SUBJECT_FILES + ["geocoding.json"]

ERAS = [
    {"id": "prehistoric", "label": "Prehistoric", "start": -2600000, "end": -3000, "style": "aged-stone", "windowWidth": 5000},
    {"id": "ancient", "label": "Ancient World", "start": -3000, "end": -500, "style": "papyrus", "windowWidth": 200},
    {"id": "classical", "label": "Classical Era", "start": -500, "end": 500, "style": "marble", "windowWidth": 100},
    {"id": "medieval", "label": "Medieval World", "start": 500, "end": 1400, "style": "parchment", "windowWidth": 75},
    {"id": "early-modern", "label": "Early Modern", "start": 1400, "end": 1700, "style": "renaissance", "windowWidth": 50},
    {"id": "modern", "label": "Modern Era", "start": 1700, "end": 1900, "style": "industrial", "windowWidth": 25},
    {"id": "contemporary", "label": "Contemporary", "start": 1900, "end": 2100, "style": "clean", "windowWidth": 10},
]

ENTRY_FIELDS = [
    "id", "year", "year_end", "year_precision", "title", "description",
    "persons", "attribution_note", "lat", "lng", "civilization", "subject",
    "secondary_subjects", "tags", "tier", "impact", "media_hint",
    "connections", "superseded_by", "references", "media", "category",
]


# ---------------------------------------------------------------------------
# Data source abstraction
# ---------------------------------------------------------------------------

class LocalDataSource:
    """Read data files from a local sibling directory."""

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir

    def fetch_manifest(self) -> dict | None:
        path = self.data_dir / "manifest.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        return None

    def fetch_file(self, filename: str) -> bytes:
        path = self.data_dir / filename
        return path.read_bytes()

    def name(self) -> str:
        return f"local ({self.data_dir})"


class GitHubDataSource:
    """Fetch data files from GitHub raw content URLs."""

    def __init__(self, base_url: str):
        self.base_url = base_url

    def fetch_manifest(self) -> dict | None:
        try:
            data = self._fetch(f"{self.base_url}/manifest.json")
            return json.loads(data)
        except urllib.error.URLError as e:
            print(f"  WARNING: Could not fetch remote manifest: {e}", file=sys.stderr)
            return None

    def fetch_file(self, filename: str) -> bytes:
        return self._fetch(f"{self.base_url}/{filename}")

    def _fetch(self, url: str) -> bytes:
        req = urllib.request.Request(url)
        # Support optional GitHub token for private repos or rate limiting
        token = os.environ.get("GITHUB_TOKEN")
        if token:
            req.add_header("Authorization", f"token {token}")
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()

    def name(self) -> str:
        return f"GitHub ({GITHUB_OWNER}/{GITHUB_REPO}@{GITHUB_BRANCH})"


def get_data_source():
    """Choose data source: local sibling if available, otherwise GitHub."""
    # Explicit env var overrides
    if os.environ.get("EPOCHLIGHT_DATA_SOURCE") == "github":
        return GitHubDataSource(GITHUB_RAW_BASE)
    if os.environ.get("EPOCHLIGHT_DATA_SOURCE") == "local":
        if not LOCAL_DATA_DIR.exists():
            print(f"ERROR: Local data dir not found: {LOCAL_DATA_DIR}", file=sys.stderr)
            sys.exit(1)
        return LocalDataSource(LOCAL_DATA_DIR)

    # Auto-detect: prefer local sibling for development
    if LOCAL_DATA_DIR.exists() and (LOCAL_DATA_DIR / "manifest.json").exists():
        return LocalDataSource(LOCAL_DATA_DIR)

    return GitHubDataSource(GITHUB_RAW_BASE)


# ---------------------------------------------------------------------------
# Cache management
# ---------------------------------------------------------------------------

def get_cached_hash() -> str | None:
    """Read the data_hash from the cached manifest."""
    cached = CACHE_DIR / "manifest.json"
    if cached.exists():
        try:
            return json.loads(cached.read_text(encoding="utf-8")).get("data_hash")
        except (json.JSONDecodeError, KeyError):
            return None
    return None


def save_cache(manifest: dict, files: dict[str, bytes]):
    """Save fetched files and manifest to the cache directory."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    for filename, content in files.items():
        (CACHE_DIR / filename).write_bytes(content)


def load_cached_files() -> dict[str, bytes] | None:
    """Load all data files from cache. Returns None if any are missing."""
    files = {}
    for filename in DATA_FILES:
        path = CACHE_DIR / filename
        if not path.exists():
            return None
        files[filename] = path.read_bytes()
    return files


def verify_cache_integrity(manifest: dict) -> bool:
    """Verify cached files match the manifest hashes."""
    for filename, info in manifest.get("files", {}).items():
        path = CACHE_DIR / filename
        if not path.exists():
            return False
        actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual_hash != info["hash"]:
            return False
    return True


# ---------------------------------------------------------------------------
# Transform helpers
# ---------------------------------------------------------------------------

def find_region_coords(tags: list[str], geocoding: dict) -> tuple[float | None, float | None]:
    for tag in tags:
        if tag.startswith("region:") and tag in geocoding:
            geo = geocoding[tag]
            return geo["lat"], geo["lng"]
    return None, None


def spiral_offset(index: int, base_offset: float = 0.3) -> tuple[float, float]:
    if index == 0:
        return 0.0, 0.0
    angle = index * 2.399  # golden angle in radians
    r = base_offset * math.sqrt(index)
    return r * math.cos(angle), r * math.sin(angle)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def transform(raw_files: dict[str, bytes]) -> dict:
    """Transform raw data files into the app's optimized JSON structure."""

    # Parse geocoding
    geocoding = json.loads(raw_files["geocoding.json"])

    # Parse all subject entries
    all_entries: list[dict] = []
    for filename in SUBJECT_FILES:
        entries = json.loads(raw_files[filename])
        all_entries.extend(entries)
        print(f"  Loaded {len(entries):>4} entries from {filename}")

    print(f"  Total raw entries: {len(all_entries)}")

    # Build lookup index
    entry_index: dict[str, dict] = {}
    for entry in all_entries:
        entry_index[entry["id"]] = entry

    # Resolve coordinates
    geo_hits = geo_misses = 0
    coord_counts: dict[tuple[float, float], int] = {}

    for entry in all_entries:
        lat = entry.get("latitude")
        lng = entry.get("longitude")
        if lat is None or lng is None:
            lat, lng = find_region_coords(entry.get("tags", []), geocoding)
        if lat is not None and lng is not None:
            geo_hits += 1
        else:
            geo_misses += 1
            lat, lng = 0.0, 0.0

        key = (lat, lng)
        idx = coord_counts.get(key, 0)
        coord_counts[key] = idx + 1
        dlat, dlng = spiral_offset(idx)
        entry["_lat"] = round(lat + dlat, 4)
        entry["_lng"] = round(lng + dlng, 4)

    # Denormalize connections
    conn_resolved = conn_missing = 0
    for entry in all_entries:
        denorm = []
        for cid in entry.get("connections", []):
            target = entry_index.get(cid)
            if target:
                denorm.append({"id": cid, "title": target["title"], "subject": target["subject"]})
                conn_resolved += 1
            else:
                denorm.append({"id": cid, "title": f"[unresolved: {cid}]", "subject": "unknown"})
                conn_missing += 1
        entry["_connections"] = denorm

    # Denormalize superseded_by
    sup_resolved = sup_missing = 0
    for entry in all_entries:
        raw = entry.get("superseded_by")
        if raw is None:
            entry["_superseded_by"] = None
        elif isinstance(raw, str):
            target = entry_index.get(raw)
            if target:
                entry["_superseded_by"] = {"id": raw, "title": target["title"], "subject": target["subject"]}
                sup_resolved += 1
            else:
                entry["_superseded_by"] = {"id": raw, "title": f"[unresolved: {raw}]", "subject": "unknown"}
                sup_missing += 1
        else:
            entry["_superseded_by"] = raw

    # Build output
    output_entries = []
    for entry in all_entries:
        out = {}
        for field in ENTRY_FIELDS:
            if field == "lat":
                out["lat"] = entry["_lat"]
            elif field == "lng":
                out["lng"] = entry["_lng"]
            elif field == "connections":
                out["connections"] = entry["_connections"]
            elif field == "superseded_by":
                out["superseded_by"] = entry["_superseded_by"]
            elif field == "references":
                out["references"] = entry.get("references") or []
            elif field in entry:
                out[field] = entry[field]
        output_entries.append(out)

    years = [e["year"] for e in all_entries]
    year_ends = [e["year_end"] for e in all_entries if e.get("year_end") is not None]
    min_year = min(years)
    max_year = max(max(years), max(year_ends) if year_ends else max(years))

    print(f"  Geocoding:  {geo_hits} hits, {geo_misses} misses")
    print(f"  Connections: {conn_resolved} resolved, {conn_missing} missing")
    print(f"  Superseded:  {sup_resolved} resolved, {sup_missing} missing")

    return {
        "meta": {
            "version": "1.0",
            "generated": datetime.now(timezone.utc).isoformat(),
            "entry_count": len(output_entries),
            "year_range": [min_year, max_year],
            "eras": ERAS,
        },
        "entries": output_entries,
    }


def main():
    print("=" * 60)
    print("  Epochlight Data Pipeline")
    print("=" * 60)

    # 1. Choose data source
    source = get_data_source()
    print(f"  Source: {source.name()}")

    # 2. Fetch remote manifest
    remote_manifest = source.fetch_manifest()
    if remote_manifest is None:
        print("  No manifest available — will fetch all files and rebuild")
        remote_hash = None
    else:
        remote_hash = remote_manifest.get("data_hash")
        print(f"  Remote data version: {remote_manifest.get('version')}")
        print(f"  Remote data hash:    {remote_hash[:16]}...")

    # 3. Check cache
    cached_hash = get_cached_hash()
    if cached_hash:
        print(f"  Cached data hash:    {cached_hash[:16]}...")

    if (
        remote_hash
        and remote_hash == cached_hash
        and OUTPUT_FILE.exists()
        and verify_cache_integrity(remote_manifest)
    ):
        print()
        print("  ✓ Data unchanged — skipping rebuild")
        print("=" * 60)
        return

    # 4. Fetch data files
    if remote_hash and remote_hash == cached_hash and verify_cache_integrity(remote_manifest):
        # Cache is valid but output file is missing — rebuild from cache
        print("  Cache valid but output missing — rebuilding from cache")
        raw_files = load_cached_files()
    else:
        # Need to fetch fresh data
        print()
        print("  Fetching data files...")
        raw_files = {}
        for filename in DATA_FILES:
            print(f"    Fetching {filename}...")
            raw_files[filename] = source.fetch_file(filename)

        # Save to cache
        if remote_manifest:
            save_cache(remote_manifest, raw_files)
            print(f"  Cached to {CACHE_DIR}")

    # 5. Transform
    print()
    print("  Transforming...")
    output = transform(raw_files)

    # 6. Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    file_size = OUTPUT_FILE.stat().st_size
    print()
    print(f"  Output: {OUTPUT_FILE}")
    print(f"  Entries: {output['meta']['entry_count']}")
    print(f"  Size: {file_size / 1024:.1f} KB")

    # 7. Merge per-subject translation files into one per language
    translations_src = LOCAL_DATA_DIR.parent / "translations"
    translations_dst = APP_DIR / "public" / "data" / "translations"
    if translations_src.exists():
        translations_dst.mkdir(parents=True, exist_ok=True)
        for lang_dir in translations_src.iterdir():
            if not lang_dir.is_dir():
                continue
            merged: dict = {}
            for f in sorted(lang_dir.glob("*.json")):
                with open(f, encoding="utf-8") as fh:
                    merged.update(json.load(fh))
            if merged:
                out_path = translations_dst / f"{lang_dir.name}.json"
                with open(out_path, "w", encoding="utf-8") as fh:
                    json.dump(merged, fh, ensure_ascii=False, separators=(",", ":"))
                size_kb = out_path.stat().st_size / 1024
                print(f"  Translation: {lang_dir.name}.json ({len(merged)} entries, {size_kb:.1f} KB)")
    else:
        print("  No translations directory found — skipping")

    print("=" * 60)


if __name__ == "__main__":
    main()
