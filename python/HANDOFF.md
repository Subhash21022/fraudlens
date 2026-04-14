# Python To TypeScript Handoff

This file defines the exact contract between the Python data-prep side and the
TypeScript agent side for the Reply Mirror sandbox and challenge datasets.

## Goal

Python teammates own dataset parsing, cleaning, joining, and normalization.
TypeScript consumes only cleaned JSON and produces the final output `.txt` file.

## What Python Should Produce

For each dataset level, write one JSON file:

- `data/cleaned/public_lev_1/monitoring-events.json`
- `data/cleaned/public_lev_2/monitoring-events.json`
- `data/cleaned/public_lev_3/monitoring-events.json`

The same naming pattern should be used later for additional datasets.

## Required Record Shape

Each JSON file should contain an array of objects with this shape:

```json
[
  {
    "eventId": "EVT_0001",
    "citizenId": "CIT_0042",
    "eventType": "routine check-up",
    "physicalActivityIndex": 63.4,
    "sleepQualityIndex": 52.1,
    "environmentalExposureLevel": 31.0,
    "timestamp": "2087-03-12T08:15:00Z",
    "user": {
      "citizenId": "CIT_0042",
      "age": 41,
      "gender": "F",
      "region": "Sector-7"
    },
    "locationSummary": {
      "points": [
        {
          "datetime": "2087-03-12T06:00:00Z",
          "lat": 45.1234,
          "lng": 9.2345
        }
      ],
      "mobilityScore": 0.42,
      "stabilityScore": 0.71,
      "environmentalStressScore": 0.28
    },
    "derivedSignals": {
      "activityTrend7d": -0.18,
      "sleepTrend7d": -0.23,
      "recentEventCount": 5
    }
  }
]
```

## Minimum Required Fields

These fields must always exist:

- `eventId`
- `citizenId`
- `eventType`
- `physicalActivityIndex`
- `sleepQualityIndex`
- `environmentalExposureLevel`
- `timestamp`

## Optional But Strongly Recommended

- `user`
- `locationSummary`
- `derivedSignals`

If the Python side cannot compute optional fields yet, it may omit them. The
TypeScript side should still be able to run on the minimum required fields.

## Responsibilities Split

Python team owns:

- unzip dataset files
- parse `Status.csv`, `Locations.csv`, and `Users.csv`
- clean missing or malformed rows
- normalize timestamps, IDs, and numeric fields
- join user/profile context into each event
- aggregate location data into a compact event-level summary
- output the cleaned JSON files above

TypeScript team owns:

- reading `monitoring-events.json`
- investigator analysis
- LLM-driven preventive decisioning
- Langfuse tracking
- final output generation

## Important Notes

- Keep `citizenId` exactly as it appears in the original data.
- Keep one JSON record per monitoring event from `Status.csv`.
- Do not precompute the final `0/1` label on the Python side.
- Do not filter out "difficult" rows unless they are invalid or unrecoverable.
- If rows are dropped, record the reason in a separate Python-side log.

## Final TypeScript Output

TypeScript will use the cleaned JSON to generate the challenge output file:

- ASCII or UTF-8 plain text
- one `citizenId` per line
- only cases recommended for preventive support
