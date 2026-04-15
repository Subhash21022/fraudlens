from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import numpy as np

from .common import CLEANED_ROOT, RAW_ROOT, clamp, parse_iso_datetime, safe_float
from .features import compute_location_summary
from .loaders import load_locations, load_status_rows, load_users
from .personas import load_personas
from .quality import build_quality_flags, build_user_payload, build_normalized_metrics


def _numeric_stats(values: List[float]) -> Dict[str, float]:
    if not values:
        return {
            "min": 0.0,
            "max": 0.0,
            "mean": 0.0,
            "median": 0.0,
            "std": 0.0,
            "slope": 0.0,
        }

    arr = np.array(values, dtype=float)
    slope = 0.0
    if len(values) >= 2:
        x = np.arange(len(values), dtype=float)
        slope, _ = np.polyfit(x, arr, 1)

    return {
        "min": round(float(np.min(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "mean": round(float(np.mean(arr)), 4),
        "median": round(float(np.median(arr)), 4),
        "std": round(float(np.std(arr)), 4),
        "slope": round(float(slope), 4),
    }


def _recent_mean(values: List[float], window: int = 5) -> float:
    if not values:
        return 0.0
    tail = values[-window:]
    return round(float(np.mean(np.array(tail, dtype=float))), 4)


def _build_citizen_preview(
    *,
    latest_activity: float,
    latest_sleep: float,
    latest_exposure: float,
    activity_stats: Dict[str, float],
    sleep_stats: Dict[str, float],
    exposure_stats: Dict[str, float],
    location_summary: Dict[str, Any],
) -> Dict[str, Any]:
    reasons: List[str] = []
    score = 0

    if latest_activity < 25:
        score += 25
        reasons.append("critical_activity_low")
    elif latest_activity < 35:
        score += 15
        reasons.append("low_activity")

    if latest_sleep < 40:
        score += 20
        reasons.append("critical_sleep_low")
    elif latest_sleep < 50:
        score += 10
        reasons.append("low_sleep")

    if latest_exposure > 75:
        score += 20
        reasons.append("very_high_exposure")
    elif latest_exposure > 60:
        score += 10
        reasons.append("high_exposure")

    if activity_stats["slope"] < -1.5:
        score += 10
        reasons.append("activity_declining_trend")

    if sleep_stats["slope"] < -1.5:
        score += 10
        reasons.append("sleep_declining_trend")

    if exposure_stats["slope"] > 1.5:
        score += 10
        reasons.append("exposure_rising_trend")

    if location_summary.get("stabilityScore", 1.0) < 0.5:
        score += 10
        reasons.append("unstable_mobility")

    if location_summary.get("environmentalStressScore", 0.0) > 0.6:
        score += 10
        reasons.append("high_environmental_stress")

    if len(reasons) >= 3:
        score += 10
        reasons.append("stacked_risk_signals")

    final_score = int(clamp(score, 0, 100))
    return {
        "riskScore": final_score,
        "reasons": reasons,
        "shouldEscalate": final_score >= 35,
    }


def _build_citizen_summary(
    *,
    citizen_id: str,
    rows: List[Dict[str, str]],
    user: Dict[str, Any] | None,
    locations: List[Any],
    persona: Dict[str, Any] | None,
) -> Dict[str, Any]:
    rows_sorted = sorted(rows, key=lambda row: parse_iso_datetime(row["Timestamp"]))

    events = []
    activity_values: List[float] = []
    sleep_values: List[float] = []
    exposure_values: List[float] = []
    quality_flags: List[str] = []

    first_time = parse_iso_datetime(rows_sorted[0]["Timestamp"])
    last_time = parse_iso_datetime(rows_sorted[-1]["Timestamp"])
    user_payload = build_user_payload(user, last_time)

    for row in rows_sorted:
        ts = parse_iso_datetime(row["Timestamp"])
        activity = safe_float(row["PhysicalActivityIndex"])
        sleep = safe_float(row["SleepQualityIndex"])
        exposure = safe_float(row["EnvironmentalExposureLevel"])

        activity_values.append(activity)
        sleep_values.append(sleep)
        exposure_values.append(exposure)

        quality_flags.extend(
            build_quality_flags(
                activity=activity,
                sleep=sleep,
                exposure=exposure,
                timestamp=row.get("Timestamp", ""),
                user=user,
                location_count=len(locations),
            )
        )

        events.append(
            {
                "eventId": row["EventID"],
                "eventType": row["EventType"],
                "timestamp": ts.isoformat(),
                "physicalActivityIndex": activity,
                "sleepQualityIndex": sleep,
                "environmentalExposureLevel": exposure,
                "normalizedMetrics": build_normalized_metrics(
                    activity, sleep, exposure
                ),
            }
        )

    activity_stats = _numeric_stats(activity_values)
    sleep_stats = _numeric_stats(sleep_values)
    exposure_stats = _numeric_stats(exposure_values)

    latest_activity = activity_values[-1]
    latest_sleep = sleep_values[-1]
    latest_exposure = exposure_values[-1]

    location_summary = compute_location_summary(locations, last_time, user)
    event_type_counts = dict(Counter(row["EventType"] for row in rows_sorted))

    days_covered = max(
        1.0, (last_time - first_time).total_seconds() / 86400.0
    )
    avg_days_between = (
        round(days_covered / (len(rows_sorted) - 1), 4)
        if len(rows_sorted) > 1
        else None
    )

    preview = _build_citizen_preview(
        latest_activity=latest_activity,
        latest_sleep=latest_sleep,
        latest_exposure=latest_exposure,
        activity_stats=activity_stats,
        sleep_stats=sleep_stats,
        exposure_stats=exposure_stats,
        location_summary=location_summary,
    )

    preprocess_flags = {
        "lowActivityLatest": latest_activity < 35,
        "poorSleepLatest": latest_sleep < 50,
        "highExposureLatest": latest_exposure > 60,
        "decliningActivityTrend": activity_stats["slope"] < -1.5,
        "decliningSleepTrend": sleep_stats["slope"] < -1.5,
        "risingExposureTrend": exposure_stats["slope"] > 1.5,
        "unstableMobility": location_summary.get("stabilityScore", 1.0) < 0.5,
        "highEnvironmentalStress": location_summary.get(
            "environmentalStressScore", 0.0
        )
        > 0.6,
        "combinedBehavioralRisk": preview["shouldEscalate"],
    }

    return {
        "citizenId": citizen_id,
        "user": user_payload,
        "persona": persona,
        "timeline": {
            "firstTimestamp": first_time.isoformat(),
            "lastTimestamp": last_time.isoformat(),
            "totalEvents": len(rows_sorted),
            "daysCovered": round(days_covered, 4),
            "averageDaysBetweenEvents": avg_days_between,
            "eventTypeCounts": event_type_counts,
        },
        "metrics": {
            "activity": {
                "first": activity_values[0],
                "latest": latest_activity,
                "deltaFromFirst": round(latest_activity - activity_values[0], 4),
                "deltaFromRecentMean5": round(
                    latest_activity - _recent_mean(activity_values, 5), 4
                ),
                **activity_stats,
            },
            "sleep": {
                "first": sleep_values[0],
                "latest": latest_sleep,
                "deltaFromFirst": round(latest_sleep - sleep_values[0], 4),
                "deltaFromRecentMean5": round(
                    latest_sleep - _recent_mean(sleep_values, 5), 4
                ),
                **sleep_stats,
            },
            "exposure": {
                "first": exposure_values[0],
                "latest": latest_exposure,
                "deltaFromFirst": round(latest_exposure - exposure_values[0], 4),
                "deltaFromRecentMean5": round(
                    latest_exposure - _recent_mean(exposure_values, 5), 4
                ),
                **exposure_stats,
            },
        },
        "locationSummary": location_summary,
        "preprocessFlags": preprocess_flags,
        "qualityFlags": sorted(set(quality_flags)),
        "pythonInvestigatorPreview": preview,
        "events": events,
    }


def build_level(level_dir: Path) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    users = load_users(level_dir)
    locations_by_user = load_locations(level_dir)
    personas_by_user = load_personas(level_dir)
    rows = load_status_rows(level_dir)

    rows_by_citizen: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for row in rows:
        rows_by_citizen[row["CitizenID"]].append(row)

    summaries: List[Dict[str, Any]] = []
    skipped_citizens = 0
    quality_counter: Counter[str] = Counter()
    preprocess_counter: Counter[str] = Counter()
    preview_escalations = 0
    citizens_with_persona = 0

    for citizen_id, citizen_rows in rows_by_citizen.items():
        try:
            persona = personas_by_user.get(citizen_id)
            summary = _build_citizen_summary(
                citizen_id=citizen_id,
                rows=citizen_rows,
                user=users.get(citizen_id),
                locations=locations_by_user.get(citizen_id, []),
                persona=persona,
            )
            summaries.append(summary)
            if persona is not None:
                citizens_with_persona += 1
            quality_counter.update(summary["qualityFlags"])
            preprocess_counter.update(
                key for key, value in summary["preprocessFlags"].items() if value
            )
            if summary["pythonInvestigatorPreview"]["shouldEscalate"]:
                preview_escalations += 1
        except Exception:
            skipped_citizens += 1

    summaries.sort(key=lambda item: item["citizenId"])

    report = {
        "level": level_dir.name,
        "totalCitizens": len(summaries),
        "totalEvents": len(rows),
        "skippedCitizens": skipped_citizens,
        "personaCoverage": {
            "citizensWithPersona": citizens_with_persona,
            "citizensWithoutPersona": len(summaries) - citizens_with_persona,
        },
        "qualityFlagCounts": dict(quality_counter),
        "preprocessFlagCounts": dict(preprocess_counter),
        "pythonPreviewEscalations": preview_escalations,
    }

    return summaries, report


def level_directories() -> Iterable[Path]:
    for level_dir in sorted(RAW_ROOT.glob("public_lev_*")):
        if level_dir.is_dir():
            yield level_dir


def write_level_output(
    level_name: str, records: List[Dict[str, Any]], report: Dict[str, Any]
) -> Tuple[Path, Path]:
    output_dir = CLEANED_ROOT / level_name
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / "monitoring-events.json"
    report_path = output_dir / "monitoring-events.report.json"

    output_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    return output_path, report_path
