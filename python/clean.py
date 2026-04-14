#!/usr/bin/env python3
"""
Read Reply CSV from data/raw/transactions.csv and write cleaned JSON to
data/cleaned/transactions.json.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]
RAW_CSV = ROOT / "data" / "raw" / "transactions.csv"
OUTPUT_JSON = ROOT / "data" / "cleaned" / "transactions.json"


def to_bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def clean_row(row: Dict[str, str]) -> Dict[str, Any]:
    return {
        "id": row["id"].strip(),
        "amount": float(row["amount"]),
        "currency": row["currency"].strip(),
        "merchant": row["merchant"].strip(),
        "merchantCategory": row["merchantCategory"].strip().lower(),
        "location": row["location"].strip(),
        "accountAge": int(row["accountAge"]),
        "avgMonthlySpend": float(row["avgMonthlySpend"]),
        "hourOfDay": int(row["hourOfDay"]),
        "dayOfWeek": row["dayOfWeek"].strip(),
        "previousFraudFlags": int(row["previousFraudFlags"]),
        "distanceFromLastTransaction": float(row["distanceFromLastTransaction"]),
        "timeSinceLastTransaction": float(row["timeSinceLastTransaction"]),
        "isInternational": to_bool(row["isInternational"]),
        "cardPresent": to_bool(row["cardPresent"]),
    }


def main() -> None:
    if not RAW_CSV.exists():
        raise FileNotFoundError(
            f"Input file not found: {RAW_CSV}. Put Reply dataset in data/raw/transactions.csv"
        )

    cleaned: List[Dict[str, Any]] = []
    skipped = 0

    with RAW_CSV.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                cleaned.append(clean_row(row))
            except Exception:
                skipped += 1

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2)

    print(f"Cleaned rows: {len(cleaned)}")
    print(f"Skipped rows: {skipped}")
    print(f"Wrote: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
