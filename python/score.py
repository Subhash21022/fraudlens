#!/usr/bin/env python3
"""Quick helper to inspect cleaned dataset sizes per sandbox level."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLEANED_ROOT = ROOT / "data" / "cleaned"


def main() -> None:
    levels = sorted(CLEANED_ROOT.glob("public_lev_*/monitoring-events.json"))
    if not levels:
        raise FileNotFoundError(
            "Missing cleaned monitoring events. Run python/clean.py first."
        )

    for path in levels:
        with path.open("r", encoding="utf-8") as handle:
            records = json.load(handle)
        print(f"{path.parent.name}: {len(records)} records in {path.name}")


if __name__ == "__main__":
    main()
