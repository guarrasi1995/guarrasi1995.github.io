#!/usr/bin/env python3
"""Update Google Scholar metrics for the Jekyll data file.

The script uses the public Google Scholar profile id configured below. Google
Scholar may occasionally rate-limit automated requests; in that case the script
exits without overwriting the existing metrics.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path
import sys

SCHOLAR_USER_ID = "840UXEMAAAAJ"
OUTPUT = Path("_data/scholar_metrics.yml")


def write_metrics(citations: int, h_index: int, i10_index: int) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "\n".join(
            [
                f"citations: {citations}",
                f"h_index: {h_index}",
                f"i10_index: {i10_index}",
                f"updated_at: {date.today().isoformat()}",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> int:
    try:
        from scholarly import scholarly
    except ImportError:
        print("Missing dependency: install with `pip install scholarly`.", file=sys.stderr)
        return 2

    try:
      author = scholarly.search_author_id(SCHOLAR_USER_ID)
      filled = scholarly.fill(author, sections=[])
      citations = int(filled.get("citedby", 0))
      h_index = int(filled.get("hindex", 0))
      i10_index = int(filled.get("i10index", 0))
    except Exception as exc:
        print(f"Could not fetch Google Scholar metrics: {exc}", file=sys.stderr)
        return 1

    if not citations and not h_index and not i10_index:
        print("Google Scholar returned empty metrics; existing data was not changed.", file=sys.stderr)
        return 1

    write_metrics(citations, h_index, i10_index)
    print(f"Updated Scholar metrics: citations={citations}, h-index={h_index}, i10-index={i10_index}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
