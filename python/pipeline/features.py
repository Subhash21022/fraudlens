from __future__ import annotations

from bisect import bisect_right
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List

import numpy as np

from .common import LocationRecord, clamp, haversine_km, safe_float
from .quality import safe_residence_coordinates


def _float_series(values: List[float]) -> np.ndarray:
    return np.array(values, dtype=float) if values else np.array([], dtype=float)


def _mean(values: List[float]) -> float:
    return round(float(np.mean(_float_series(values))), 4) if values else 0.0


def _std(values: List[float]) -> float:
    return round(float(np.std(_float_series(values))), 4) if values else 0.0


def _slope(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0

    x = np.arange(len(values), dtype=float)
    y = np.array(values, dtype=float)
    slope, _ = np.polyfit(x, y, 1)
    return round(float(slope), 4)


def _delta(current: float, values: List[float]) -> float:
    return round(current - _mean(values), 4) if values else round(current, 4)


def compute_location_summary(
    records: List[LocationRecord], event_time: datetime, user: Dict[str, Any] | None
) -> Dict[str, Any]:
    if not records:
        return {
            "points": [],
            "mobilityScore": 0.0,
            "stabilityScore": 1.0,
            "environmentalStressScore": 0.0,
            "uniqueCities10": 0,
            "totalDistanceKm10": 0.0,
            "avgStepDistanceKm10": 0.0,
            "distanceFromHomeKm": 0.0,
        }

    timestamps = [record.timestamp for record in records]
    upto_index = bisect_right(timestamps, event_time)
    relevant = records[:upto_index] or records[:1]
    recent = relevant[-10:]

    distances: List[float] = []
    cities = {point.city for point in recent if point.city}
    for prev, current in zip(recent, recent[1:]):
        distances.append(haversine_km(prev.lat, prev.lng, current.lat, current.lng))

    total_distance = sum(distances)
    avg_distance = total_distance / len(distances) if distances else 0.0

    residence_lat, residence_lng = safe_residence_coordinates(user)
    distance_from_home = 0.0
    if residence_lat is not None and residence_lng is not None and recent:
        latest = recent[-1]
        distance_from_home = haversine_km(
            residence_lat,
            residence_lng,
            latest.lat,
            latest.lng,
        )

    mobility_score = round(min(1.0, total_distance / 100.0), 4)
    stability_score = round(max(0.0, 1.0 - min(1.0, len(cities) / 10.0)), 4)
    environmental_stress_score = round(
        min(1.0, (avg_distance / 20.0) + (distance_from_home / 50.0)), 4
    )

    return {
        "points": [
            {
                "datetime": point.timestamp.isoformat(),
                "lat": point.lat,
                "lng": point.lng,
                "city": point.city,
            }
            for point in recent
        ],
        "mobilityScore": mobility_score,
        "stabilityScore": stability_score,
        "environmentalStressScore": environmental_stress_score,
        "uniqueCities10": len(cities),
        "totalDistanceKm10": round(total_distance, 4),
        "avgStepDistanceKm10": round(avg_distance, 4),
        "distanceFromHomeKm": round(distance_from_home, 4),
    }


def compute_history_features(
    *,
    previous_events: List[Dict[str, Any]],
    event_time: datetime,
    current_activity: float,
    current_sleep: float,
    current_exposure: float,
) -> Dict[str, Any]:
    recent3 = previous_events[-3:]
    recent5 = previous_events[-5:]

    prev_activity_3 = [safe_float(event["physicalActivityIndex"]) for event in recent3]
    prev_sleep_3 = [safe_float(event["sleepQualityIndex"]) for event in recent3]
    prev_exposure_3 = [safe_float(event["environmentalExposureLevel"]) for event in recent3]

    prev_activity_5 = [safe_float(event["physicalActivityIndex"]) for event in recent5]
    prev_sleep_5 = [safe_float(event["sleepQualityIndex"]) for event in recent5]
    prev_exposure_5 = [safe_float(event["environmentalExposureLevel"]) for event in recent5]

    previous_timestamp = (
        datetime.fromisoformat(previous_events[-1]["timestamp"])
        if previous_events
        else None
    )
    days_since_previous = (
        round((event_time - previous_timestamp).total_seconds() / 86400.0, 4)
        if previous_timestamp
        else None
    )

    last_30_days_threshold = event_time - timedelta(days=30)
    recent_30_day_events = [
        event
        for event in previous_events
        if datetime.fromisoformat(event["timestamp"]) >= last_30_days_threshold
    ]
    recent_event_types = Counter(event["eventType"] for event in recent_30_day_events)

    return {
        "recentEventCount": len(previous_events),
        "activityMean3": _mean(prev_activity_3),
        "sleepMean3": _mean(prev_sleep_3),
        "exposureMean3": _mean(prev_exposure_3),
        "activityMean5": _mean(prev_activity_5),
        "sleepMean5": _mean(prev_sleep_5),
        "exposureMean5": _mean(prev_exposure_5),
        "activityStd5": _std(prev_activity_5),
        "sleepStd5": _std(prev_sleep_5),
        "exposureStd5": _std(prev_exposure_5),
        "activitySlope5": _slope(prev_activity_5 + [current_activity]),
        "sleepSlope5": _slope(prev_sleep_5 + [current_sleep]),
        "exposureSlope5": _slope(prev_exposure_5 + [current_exposure]),
        "activityDeltaFromMean5": _delta(current_activity, prev_activity_5),
        "sleepDeltaFromMean5": _delta(current_sleep, prev_sleep_5),
        "exposureDeltaFromMean5": _delta(current_exposure, prev_exposure_5),
        "daysSincePreviousEvent": days_since_previous,
        "eventFrequency30d": len(recent_30_day_events),
        "recentRoutineCount": recent_event_types.get("routine check-up", 0),
        "recentScreeningCount": recent_event_types.get("preventive screening", 0),
        "recentCoachingCount": recent_event_types.get("lifestyle coaching session", 0),
    }


def build_derived_signals(
    history_features: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "recentEventCount": history_features["recentEventCount"],
        "activityDeltaFromRecentAverage": history_features["activityDeltaFromMean5"],
        "sleepDeltaFromRecentAverage": history_features["sleepDeltaFromMean5"],
        "exposureDeltaFromRecentAverage": history_features["exposureDeltaFromMean5"],
        "activitySlope5": history_features["activitySlope5"],
        "sleepSlope5": history_features["sleepSlope5"],
        "exposureSlope5": history_features["exposureSlope5"],
    }


def build_preprocess_flags(
    *,
    activity: float,
    sleep: float,
    exposure: float,
    history_features: Dict[str, Any],
    location_summary: Dict[str, Any],
) -> Dict[str, bool]:
    low_activity = activity < 35
    poor_sleep = sleep < 50
    high_exposure = exposure > 60
    declining_activity = history_features["activityDeltaFromMean5"] < -5 or history_features["activitySlope5"] < -1.5
    declining_sleep = history_features["sleepDeltaFromMean5"] < -5 or history_features["sleepSlope5"] < -1.5
    volatile_activity = history_features["activityStd5"] > 12
    volatile_sleep = history_features["sleepStd5"] > 12
    unstable_mobility = location_summary["stabilityScore"] < 0.5
    high_environmental_stress = location_summary["environmentalStressScore"] > 0.6
    combined_behavioral_risk = sum(
        [
            low_activity,
            poor_sleep,
            high_exposure,
            declining_activity,
            declining_sleep,
            unstable_mobility,
            high_environmental_stress,
        ]
    ) >= 3

    return {
        "lowActivity": low_activity,
        "poorSleep": poor_sleep,
        "highExposure": high_exposure,
        "decliningActivity": declining_activity,
        "decliningSleep": declining_sleep,
        "volatileActivity": volatile_activity,
        "volatileSleep": volatile_sleep,
        "unstableMobility": unstable_mobility,
        "highEnvironmentalStress": high_environmental_stress,
        "combinedBehavioralRisk": combined_behavioral_risk,
    }


def build_python_investigator_preview(
    *,
    activity: float,
    sleep: float,
    exposure: float,
    history_features: Dict[str, Any],
    location_summary: Dict[str, Any],
    preprocess_flags: Dict[str, bool],
) -> Dict[str, Any]:
    score = 0
    reasons: List[str] = []

    if activity < 25:
        score += 25
        reasons.append("critical_activity_drop")
    elif preprocess_flags["lowActivity"]:
        score += 15
        reasons.append("low_activity")

    if sleep < 40:
        score += 20
        reasons.append("critical_sleep_drop")
    elif preprocess_flags["poorSleep"]:
        score += 10
        reasons.append("poor_sleep")

    if exposure > 75:
        score += 20
        reasons.append("very_high_exposure")
    elif preprocess_flags["highExposure"]:
        score += 10
        reasons.append("high_exposure")

    if preprocess_flags["decliningActivity"]:
        score += 10
        reasons.append("declining_activity_trend")

    if preprocess_flags["decliningSleep"]:
        score += 10
        reasons.append("declining_sleep_trend")

    if preprocess_flags["unstableMobility"]:
        score += 10
        reasons.append("unstable_mobility")

    if preprocess_flags["highEnvironmentalStress"]:
        score += 10
        reasons.append("environmental_stress")

    if preprocess_flags["combinedBehavioralRisk"]:
        score += 10
        reasons.append("stacked_risk_signals")

    return {
        "riskScore": int(clamp(score, 0, 100)),
        "reasons": reasons,
        "shouldEscalate": score >= 35,
        "snapshot": {
            "activityMean5": history_features["activityMean5"],
            "sleepMean5": history_features["sleepMean5"],
            "exposureMean5": history_features["exposureMean5"],
            "stabilityScore": location_summary["stabilityScore"],
            "environmentalStressScore": location_summary["environmentalStressScore"],
        },
    }
