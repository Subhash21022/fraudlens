#!/usr/bin/env python3
"""
Optional local scoring helper for data team experiments.
Keeps this folder independent from the TypeScript agent pipeline.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT_JSON = ROOT / "data" / "cleaned" / "transactions.json"


def main() -> None:
    if not INPUT_JSON.exists():
        raise FileNotFoundError(f"Missing input: {INPUT_JSON}")

    with INPUT_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Transactions available for scoring: {len(data)}")


if __name__ == "__main__":
    main()
