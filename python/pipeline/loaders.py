from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

from .common import LocationRecord, parse_iso_datetime, safe_float


def load_users(level_dir: Path) -> Dict[str, Dict[str, Any]]:
    with (level_dir / "users.json").open("r", encoding="utf-8") as handle:
        users = json.load(handle)

    return {
        user["user_id"]: {
            "citizenId": user["user_id"],
            "firstName": user.get("first_name"),
            "lastName": user.get("last_name"),
            "birthYear": user.get("birth_year"),
            "job": user.get("job"),
            "residence": user.get("residence", {}),
        }
        for user in users
    }


def load_locations(level_dir: Path) -> Dict[str, List[LocationRecord]]:
    with (level_dir / "locations.json").open("r", encoding="utf-8") as handle:
        locations = json.load(handle)

    grouped: Dict[str, List[LocationRecord]] = defaultdict(list)
    for row in locations:
        grouped[row["user_id"]].append(
            LocationRecord(
                timestamp=parse_iso_datetime(row["timestamp"]),
                lat=safe_float(row["lat"]),
                lng=safe_float(row["lng"]),
                city=row.get("city", ""),
            )
        )

    for records in grouped.values():
        records.sort(key=lambda item: item.timestamp)

    return grouped


def load_status_rows(level_dir: Path) -> List[Dict[str, str]]:
    with (level_dir / "status.csv").open("r", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    rows.sort(
        key=lambda row: (
            row.get("CitizenID", ""),
            parse_iso_datetime(row["Timestamp"]),
            row.get("EventID", ""),
        )
    )
    return rows
