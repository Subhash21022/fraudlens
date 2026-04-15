from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from .common import clamp, safe_float


def normalize_metric(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    if upper <= lower:
        return 0.0
    return round((clamp(value, lower, upper) - lower) / (upper - lower), 4)


def derive_age(user: Dict[str, Any] | None, event_time: datetime) -> int | None:
    if not user:
        return None

    birth_year = user.get("birthYear")
    if birth_year is None:
        return None

    try:
        return event_time.year - int(birth_year)
    except (TypeError, ValueError):
        return None


def build_user_payload(user: Dict[str, Any] | None, event_time: datetime) -> Dict[str, Any] | None:
    if user is None:
        return None

    return {
        "citizenId": user["citizenId"],
        "birthYear": user.get("birthYear"),
        "age": derive_age(user, event_time),
        "job": user.get("job"),
        "residence": user.get("residence", {}),
    }


def build_quality_flags(
    *,
    activity: float,
    sleep: float,
    exposure: float,
    timestamp: str,
    user: Dict[str, Any] | None,
    location_count: int,
) -> List[str]:
    flags: List[str] = []

    if activity < 0 or activity > 100:
        flags.append("activity_out_of_expected_range")
    if sleep < 0 or sleep > 100:
        flags.append("sleep_out_of_expected_range")
    if exposure < 0 or exposure > 100:
        flags.append("exposure_out_of_expected_range")

    if not timestamp:
        flags.append("missing_timestamp")
    if user is None:
        flags.append("missing_user_profile")
    if location_count == 0:
        flags.append("missing_location_history")

    return flags


def build_normalized_metrics(activity: float, sleep: float, exposure: float) -> Dict[str, float]:
    return {
        "activityNormalized": normalize_metric(activity),
        "sleepNormalized": normalize_metric(sleep),
        "exposureNormalized": normalize_metric(exposure),
        "activityRiskNormalized": round(1.0 - normalize_metric(activity), 4),
        "sleepRiskNormalized": round(1.0 - normalize_metric(sleep), 4),
        "exposureRiskNormalized": normalize_metric(exposure),
    }


def safe_residence_coordinates(user: Dict[str, Any] | None) -> tuple[float | None, float | None]:
    if not user:
        return None, None

    residence = user.get("residence", {})
    return safe_float(residence.get("lat"), None), safe_float(residence.get("lng"), None)
