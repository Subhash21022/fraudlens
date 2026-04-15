#!/usr/bin/env python3
"""Build cleaned monitoring-event JSON files from the Reply Mirror sandbox data."""

from __future__ import annotations

from pipeline.build import build_level, level_directories, write_level_output


def main() -> None:
    levels = list(level_directories())
    if not levels:
        raise FileNotFoundError("No public level folders found under data/raw")

    total_written = 0
    total_skipped = 0
    for level_dir in levels:
        cleaned, report = build_level(level_dir)
        output_path, report_path = write_level_output(
            level_dir.name, cleaned, report
        )
        total_written += len(cleaned)
        total_skipped += report["skippedCitizens"]

        print(
            f"{level_dir.name}: wrote {len(cleaned)} citizens, skipped {report['skippedCitizens']}, "
            f"python-preview-escalations={report['pythonPreviewEscalations']}, "
            f"output={output_path}, report={report_path}"
        )

    print(f"Total cleaned citizens: {total_written}")
    print(f"Total skipped citizens: {total_skipped}")


if __name__ == "__main__":
    main()
