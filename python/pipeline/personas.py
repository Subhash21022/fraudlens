from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict


HEADER_PATTERN = re.compile(
    r"^##\s+([A-Z0-9]+)\s+-\s+(.+)$", re.MULTILINE
)
PROFILE_PATTERN = re.compile(
    r"\*\*Age:\*\*\s*(\d+)\s*\|\s*\*\*Occupation:\*\*\s*(.*?)\s*\|\s*\*\*City:\*\*\s*(.+)"
)
LABELED_LINE_PATTERN = re.compile(r"^\*\*(.+?):\*\*\s*(.+)$")


def _normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _extract_persona_flags(text_blob: str) -> Dict[str, bool]:
    text = text_blob.lower()
    risk_keywords = [
        "declining",
        "withdraw",
        "withdrawing",
        "fatigue",
        "sleep issues",
        "poor sleep",
        "weight loss",
        "avoids medical",
        "isolated",
        "irregular",
        "pain",
    ]
    support_keywords = [
        "stable",
        "well-managed",
        "support network",
        "regular",
        "active lifestyle",
        "coordinated care",
        "community",
    ]

    has_risk = any(keyword in text for keyword in risk_keywords)
    has_support = any(keyword in text for keyword in support_keywords)

    return {
        "personaRiskSignalsPresent": has_risk,
        "personaProtectiveSignalsPresent": has_support,
    }


def _parse_single_block(citizen_id: str, name: str, block: str) -> Dict[str, Any]:
    lines = [line.rstrip() for line in block.strip().splitlines()]

    age: int | None = None
    occupation: str | None = None
    city: str | None = None
    mobility: str | None = None
    health_behavior: str | None = None
    social_pattern: str | None = None
    narrative_parts: list[str] = []

    for line in lines:
        if not line:
            continue

        profile_match = PROFILE_PATTERN.search(line)
        if profile_match:
            age = int(profile_match.group(1))
            occupation = _normalize_spaces(profile_match.group(2))
            city = _normalize_spaces(profile_match.group(3))
            continue

        labeled_line = LABELED_LINE_PATTERN.match(line.strip())
        if labeled_line:
            label = labeled_line.group(1).strip().lower()
            value = _normalize_spaces(labeled_line.group(2))
            if label == "mobility":
                mobility = value
            elif label == "health behavior":
                health_behavior = value
            elif label == "social pattern":
                social_pattern = value
            continue

        if not line.startswith("---"):
            narrative_parts.append(_normalize_spaces(line))

    narrative = " ".join(part for part in narrative_parts if part)
    text_blob = " ".join(
        value
        for value in [narrative, mobility, health_behavior, social_pattern]
        if value
    )

    return {
        "citizenId": citizen_id,
        "name": _normalize_spaces(name),
        "ageFromPersona": age,
        "occupationFromPersona": occupation,
        "cityFromPersona": city,
        "narrative": narrative,
        "mobilityDescription": mobility,
        "healthBehaviorDescription": health_behavior,
        "socialPatternDescription": social_pattern,
        "flags": _extract_persona_flags(text_blob),
    }


def load_personas(level_dir: Path) -> Dict[str, Dict[str, Any]]:
    personas_path = level_dir / "personas.md"
    if not personas_path.exists():
        return {}

    content = personas_path.read_text(encoding="utf-8")
    headers = list(HEADER_PATTERN.finditer(content))
    if not headers:
        return {}

    personas: Dict[str, Dict[str, Any]] = {}
    for index, header in enumerate(headers):
        citizen_id = header.group(1).strip()
        name = header.group(2).strip()
        start = header.end()
        end = headers[index + 1].start() if index + 1 < len(headers) else len(content)
        block = content[start:end]
        personas[citizen_id] = _parse_single_block(citizen_id, name, block)

    return personas
