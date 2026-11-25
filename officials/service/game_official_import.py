"""Parses the officials self-report Google Sheet export (.csv/.xlsx) into
reviewable suggestions for the two branches the sheet's own "Für welchen
Bereich möchtest du einen Einsatz melden?" question distinguishes:

- "außerhalb DFFL" - a game officiated outside the DFFL platform, to become
  a new OfficialExternalGames row (see ExternalGameOfficialEntry).
- "DFFL" - a report that an existing internal game's official assignment
  is wrong, to become a GameOfficial create/update (see
  GameOfficialCorrectionEntry).

This module only produces suggestions (ParsedImportResult) - it never
writes to the database itself. The views layer re-validates and saves each
checked row from scratch at confirm time (see GameOfficialImportConfirmView),
so staleness between preview and confirm is handled there, not here.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

import pandas as pd

from gamedays.models import GameOfficial
from officials.models import Official, OfficialExternalGames
from officials.service.association_resolution import (
    UnknownAssociationError,
    resolve_association,
)
from officials.service.game_official_entries import (
    ALLOWED_POSITIONS,
    EXTERNAL_ALLOWED_POSITIONS,
    classify_match_count,
)

# The sheet's own branch-selector question - substring-matched
# case-insensitively against BRANCH_MARKER_EXTERNAL / BRANCH_MARKER_INTERNAL_FIX.
BRANCH_COLUMN = "Für welchen Bereich möchtest du einen Einsatz melden?"

# "außerhalb DFFL" contains "dffl" too, so it must be checked before the
# internal-fix marker - see _detect_branch().
BRANCH_MARKER_EXTERNAL = "außerhalb"
BRANCH_MARKER_INTERNAL_FIX = "dffl"

# Header maps: OfficialExternalGames/GameOfficialCorrectionEntry field name
# -> the sheet's exact column header. Confirmed against the live sheet
# export (see the module docstring's Google Form question wording).
# "Welche Position?" appears twice in the raw sheet (once per branch) -
# pandas.read_csv/read_excel auto-suffix the second occurrence ".1", so
# the DFFL branch keeps the bare header and the external branch uses the
# suffixed one.
EXTERNAL_COLUMNS = {
    "official_id": "Lizenznummer",
    "number_games": "Anzahl Spiele",
    "date": "Wann hat der Einsatz stattgefunden?",
    "position": "Welche Position?.1",
    "association": "Unter welchem Verband hat der Einsatz stattgefunden?",
    "is_international": "Internationales Turnier",
    "halftime_duration": "Dauer einer Halbzeit?",
    "has_clockcontrol": "Mit Clock Control?",
    "comment": "Anmerkung - Turniername",
    "reporter_name": "Name",
    "notification_date": "Zeitstempel",
}

INTERNAL_FIX_COLUMNS = {
    "gameinfo_id": "Wie ist die ID des fehlerhaften Spiels?",
    "official_id": "Wie ist deine Lizenznummer?",
    "position": "Welche Position?",
}


class ImportColumnError(Exception):
    """Raised when a branch's required columns can't be found in the
    uploaded file - naming both what's missing and what was actually
    found, so staff can tell at a glance whether they uploaded the wrong
    export or the sheet's headers changed. Never silently guessed."""


@dataclass
class ExternalGameSuggestion:
    row_number: int
    status: str  # "ready" | "needs_attention" | "duplicate"
    reason: str
    include_default: bool
    official_id: Optional[int]
    official_display: str
    number_games: Optional[int]
    date: Optional[date]
    position: str
    association: str
    halftime_duration: Optional[int]
    has_clockcontrol: bool
    is_international: bool
    reporter_name: str
    notification_date: Optional[date]
    comment: str


@dataclass
class InternalFixSuggestion:
    row_number: int
    status: str  # "ready" | "needs_attention"
    reason: str
    include_default: bool
    gameinfo_id: Optional[int]
    official_id: Optional[int]
    official_display: str
    position: str
    action: str  # "create" | "update" | "ambiguous"
    current_official_display: str


@dataclass
class UnclassifiedRowSuggestion:
    row_number: int
    reason: str
    raw: dict = field(default_factory=dict)


@dataclass
class ParsedImportResult:
    external: list[ExternalGameSuggestion]
    internal_fix: list[InternalFixSuggestion]
    unclassified: list[UnclassifiedRowSuggestion]


def parse_uploaded_file(uploaded_file) -> pd.DataFrame:
    """Reads a staff-uploaded .csv/.xlsx export into a DataFrame of raw
    string values - no branch/field interpretation happens here, only
    build_import_result() does that, so this stays a pure "can we even
    read this file" step."""
    name = (getattr(uploaded_file, "name", "") or "").lower()
    if name.endswith(".csv"):
        return pd.read_csv(uploaded_file, dtype=str, keep_default_na=False)
    if name.endswith(".xlsx") or name.endswith(".xls"):
        return pd.read_excel(uploaded_file, dtype=str, keep_default_na=False)
    raise ImportColumnError(
        f"Nicht unterstütztes Dateiformat: '{getattr(uploaded_file, 'name', '')}'. "
        "Bitte eine .csv- oder .xlsx-Datei hochladen."
    )


def _detect_branch(raw_value) -> Optional[str]:
    normalized = _clean_str(raw_value).lower()
    if BRANCH_MARKER_EXTERNAL in normalized:
        return "external"
    if BRANCH_MARKER_INTERNAL_FIX in normalized:
        return "internal_fix"
    return None


def _require_columns(df: pd.DataFrame, required: dict, branch_label: str) -> None:
    missing = [header for header in required.values() if header not in df.columns]
    if missing:
        raise ImportColumnError(
            f"Für den Bereich '{branch_label}' fehlen folgende Spalten: "
            f"{', '.join(missing)}. Gefundene Spalten: {', '.join(df.columns)}"
        )


def _clean_str(raw_value) -> str:
    """Normalizes a raw cell value to a plain, stripped string. Guards
    against pandas surfacing an empty cell as NaN (a float) rather than
    "" - which can happen for .xlsx sheets regardless of
    keep_default_na=False for genuinely blank cells - so every _to_*()
    helper below can assume a plain string."""
    if raw_value is None:
        return ""
    if isinstance(raw_value, float) and pd.isna(raw_value):
        return ""
    return str(raw_value).strip()


def _to_int(raw_value, label, errors) -> Optional[int]:
    stripped = _clean_str(raw_value)
    if not stripped:
        errors.append(f"{label} fehlt.")
        return None
    try:
        return int(float(stripped.replace(",", ".")))
    except (TypeError, ValueError):
        errors.append(f"{label} muss eine Zahl sein: '{raw_value}'.")
        return None


def _to_position(raw_value, errors, allowed=ALLOWED_POSITIONS) -> str:
    stripped = _clean_str(raw_value)
    if stripped in allowed:
        return stripped
    errors.append(f"Ungültige Position: '{stripped}'.")
    return stripped


def _to_bool(raw_value, label, errors) -> bool:
    normalized = _clean_str(raw_value).lower()
    if normalized in ("ja", "true", "1", "yes"):
        return True
    if normalized in ("nein", "false", "0", "no", ""):
        return False
    errors.append(f"{label}: unbekannter Wert '{raw_value}'.")
    return False


def _parse_date_flexible(stripped: str) -> Optional[date]:
    """Parses a date/datetime cell value that may come from either a
    .csv export (German display-format strings like "10.06.2023" /
    "10.06.2023 03:31:19") or an .xlsx export, where the source columns
    are native Excel date/datetime cells that parse_uploaded_file()'s
    dtype=str read stringifies via Python's default
    str(datetime)/str(Timestamp) representation - "2023-06-10 00:00:00"
    or "2023-09-05 03:31:19.233000" (variable microsecond precision).

    ISO-shaped strings are tried first with a strict ISO8601 parse.
    This matters because pandas' dayfirst=True flexible parser - needed
    to correctly resolve the German DD.MM.YYYY format - also
    reinterprets unambiguous "YYYY-MM-DD" strings as "YYYY-DD-MM"
    whenever both components are <=12 (e.g. it would silently turn
    "2023-06-10" into 2023-10-06). Only when the strict ISO8601 parse
    fails do we fall back to the dayfirst=True flexible parse, which
    correctly handles the German display format.

    The real production spreadsheet also contains a handful of rows with
    corrupted year values left over from years of manual data entry, e.g.
    "1/21/0023" or "5/25/0225" instead of "1/21/2023"/"5/25/2025". The
    dayfirst=True fallback "successfully" parses these to nonsensical
    years (23, 225, ...) rather than raising, which would let obviously
    corrupt data through as a clean result. Since every genuine date in
    this domain falls within 2023-2026, any parsed year below 2000 is
    treated the same as an unparseable value.
    """
    parsed = pd.to_datetime(stripped, format="ISO8601", errors="coerce")
    if pd.isna(parsed):
        parsed = pd.to_datetime(stripped, dayfirst=True, errors="coerce")
    if pd.isna(parsed):
        return None
    if parsed.year < 2000:
        return None
    return parsed.date()


def _to_date(raw_value, label, errors) -> Optional[date]:
    stripped = _clean_str(raw_value)
    if not stripped:
        errors.append(f"{label} fehlt.")
        return None
    parsed = _parse_date_flexible(stripped)
    if parsed is None:
        errors.append(f"{label} hat ein unbekanntes Format: '{stripped}'.")
    return parsed


def _to_notification_date(raw_value, errors) -> Optional[date]:
    # "Zeitstempel" ("Notification date") is optional at parse time - the
    # entry class itself falls back to today() when it's None - so an
    # empty value here is not an error, only an unparseable one is.
    stripped = _clean_str(raw_value)
    if not stripped:
        return None
    parsed = _parse_date_flexible(stripped)
    if parsed is None:
        errors.append(f"Zeitstempel hat ein unbekanntes Format: '{stripped}'.")
    return parsed


def _parse_external_row(row_number, raw: dict) -> dict:
    errors: list[str] = []
    return {
        "row_number": row_number,
        "official_id": _to_int(
            raw.get(EXTERNAL_COLUMNS["official_id"]), "Lizenznummer", errors
        ),
        "number_games": _to_int(
            raw.get(EXTERNAL_COLUMNS["number_games"]), "Anzahl Spiele", errors
        ),
        "date": _to_date(raw.get(EXTERNAL_COLUMNS["date"]), "Einsatzdatum", errors),
        "position": _to_position(
            raw.get(EXTERNAL_COLUMNS["position"]),
            errors,
            allowed=EXTERNAL_ALLOWED_POSITIONS,
        ),
        "association": _clean_str(raw.get(EXTERNAL_COLUMNS["association"])),
        "halftime_duration": _to_int(
            raw.get(EXTERNAL_COLUMNS["halftime_duration"]),
            "Dauer einer Halbzeit",
            errors,
        ),
        "has_clockcontrol": _to_bool(
            raw.get(EXTERNAL_COLUMNS["has_clockcontrol"]), "Clock Control", errors
        ),
        "is_international": _to_bool(
            raw.get(EXTERNAL_COLUMNS["is_international"]),
            "Internationales Turnier",
            errors,
        ),
        "reporter_name": _clean_str(raw.get(EXTERNAL_COLUMNS["reporter_name"])),
        "notification_date": _to_notification_date(
            raw.get(EXTERNAL_COLUMNS["notification_date"]), errors
        ),
        "comment": _clean_str(raw.get(EXTERNAL_COLUMNS["comment"])),
        "errors": errors,
    }


def _parse_internal_fix_row(row_number, raw: dict) -> dict:
    errors: list[str] = []
    return {
        "row_number": row_number,
        "gameinfo_id": _to_int(
            raw.get(INTERNAL_FIX_COLUMNS["gameinfo_id"]), "Spiel-ID", errors
        ),
        "official_id": _to_int(
            raw.get(INTERNAL_FIX_COLUMNS["official_id"]), "Lizenznummer", errors
        ),
        "position": _to_position(raw.get(INTERNAL_FIX_COLUMNS["position"]), errors),
        "errors": errors,
    }


def _resolve_officials_by_id(official_ids) -> dict:
    if not official_ids:
        return {}
    return {
        official.pk: f"{official.first_name} {official.last_name}"
        for official in Official.objects.filter(pk__in=official_ids)
    }


def _resolve_existing_external_keys(external_parsed) -> set:
    official_ids = {
        parsed["official_id"]
        for parsed in external_parsed
        if parsed["official_id"] is not None
    }
    if not official_ids:
        return set()
    # association is a FK since migration 0017 - compare the stable
    # abbreviation, which is also what the stored suggestion carries.
    return set(
        OfficialExternalGames.objects.filter(official_id__in=official_ids).values_list(
            "official_id", "date", "position", "association__abbr", "number_games"
        )
    )


def _resolve_associations_by_value(external_parsed) -> dict:
    """Resolve every distinct sheet value once, so an unknown association is
    a per-row error at upload time (not a 500 or a silent NULL at confirm)."""
    values = {parsed["association"] for parsed in external_parsed}
    resolved = {}
    for value in values:
        try:
            resolved[value] = resolve_association(value)
        except UnknownAssociationError:
            resolved[value] = None
    return resolved


def _resolve_game_official_matches(internal_fix_parsed) -> dict:
    gameinfo_ids = {
        parsed["gameinfo_id"]
        for parsed in internal_fix_parsed
        if parsed["gameinfo_id"] is not None
    }
    positions = {
        parsed["position"] for parsed in internal_fix_parsed if parsed["position"]
    }
    if not gameinfo_ids or not positions:
        return {}
    matches_by_key = defaultdict(list)
    game_officials = GameOfficial.objects.filter(
        gameinfo_id__in=gameinfo_ids, position__in=positions
    ).select_related("official")
    for game_official in game_officials:
        matches_by_key[(game_official.gameinfo_id, game_official.position)].append(
            game_official
        )
    return matches_by_key


def _build_external_suggestion(
    parsed: dict, officials_by_id: dict, existing_keys: set, associations_by_value: dict
) -> ExternalGameSuggestion:
    errors = list(parsed["errors"])
    official_id = parsed["official_id"]
    official_display = ""
    if official_id is not None:
        official_display = officials_by_id.get(official_id, "")
        if not official_display:
            errors.append(f"Official mit ID {official_id} wurde nicht gefunden.")

    association = associations_by_value.get(parsed["association"])
    if association is None:
        errors.append(f"Unbekannter Verband: '{parsed['association']}'.")

    is_duplicate = False
    if not errors:
        key = (
            official_id,
            parsed["date"],
            parsed["position"],
            association.abbr,
            parsed["number_games"],
        )
        is_duplicate = key in existing_keys

    if errors:
        status, reason, include_default = "needs_attention", " ".join(errors), False
    elif is_duplicate:
        status = "duplicate"
        reason = "Ein identischer Eintrag existiert bereits."
        include_default = False
    else:
        status, reason, include_default = "ready", "", True

    return ExternalGameSuggestion(
        row_number=parsed["row_number"],
        status=status,
        reason=reason,
        include_default=include_default,
        official_id=official_id,
        official_display=official_display,
        number_games=parsed["number_games"],
        date=parsed["date"],
        position=parsed["position"],
        association=parsed["association"],
        halftime_duration=parsed["halftime_duration"],
        has_clockcontrol=parsed["has_clockcontrol"],
        is_international=parsed["is_international"],
        reporter_name=parsed["reporter_name"],
        notification_date=parsed["notification_date"],
        comment=parsed["comment"],
    )


def _build_internal_fix_suggestion(
    parsed: dict, officials_by_id: dict, matches_by_key: dict
) -> InternalFixSuggestion:
    errors = list(parsed["errors"])
    official_id = parsed["official_id"]
    official_display = ""
    if official_id is not None:
        official_display = officials_by_id.get(official_id, "")
        if not official_display:
            errors.append(f"Official mit ID {official_id} wurde nicht gefunden.")

    gameinfo_id = parsed["gameinfo_id"]
    action = "create"
    current_official_display = ""
    if gameinfo_id is not None and parsed["position"]:
        matches = matches_by_key.get((gameinfo_id, parsed["position"]), [])
        action = classify_match_count(matches)
        if action == "update":
            current = matches[0].official
            current_official_display = (
                f"{current.first_name} {current.last_name}"
                if current
                else "(kein Official gesetzt)"
            )
        elif action == "ambiguous":
            errors.append(
                f"Mehrere bestehende Einträge für Spiel {gameinfo_id} - "
                f"{parsed['position']} gefunden."
            )

    if errors:
        status, reason, include_default = "needs_attention", " ".join(errors), False
    else:
        status, reason, include_default = "ready", "", True

    return InternalFixSuggestion(
        row_number=parsed["row_number"],
        status=status,
        reason=reason,
        include_default=include_default,
        gameinfo_id=gameinfo_id,
        official_id=official_id,
        official_display=official_display,
        position=parsed["position"],
        action=action,
        current_official_display=current_official_display,
    )


def build_import_result(df: pd.DataFrame) -> ParsedImportResult:
    if BRANCH_COLUMN not in df.columns:
        raise ImportColumnError(
            f"Die Spalte '{BRANCH_COLUMN}' fehlt - Bereichs-Erkennung nicht möglich. "
            f"Gefundene Spalten: {', '.join(df.columns)}"
        )

    external_raw = []
    internal_fix_raw = []
    unclassified = []
    for offset, raw in enumerate(df.to_dict("records")):
        # +2: 1-based, plus the header row itself.
        row_number = offset + 2
        branch = _detect_branch(raw.get(BRANCH_COLUMN))
        if branch == "external":
            external_raw.append((row_number, raw))
        elif branch == "internal_fix":
            internal_fix_raw.append((row_number, raw))
        else:
            value = raw.get(BRANCH_COLUMN, "")
            unclassified.append(
                UnclassifiedRowSuggestion(
                    row_number=row_number,
                    reason=(
                        f"Wert '{value}' in Spalte '{BRANCH_COLUMN}' passt zu "
                        "keinem bekannten Bereich (weder 'außerhalb DFFL' noch 'DFFL')."
                    ),
                    raw=raw,
                )
            )

    if external_raw:
        _require_columns(df, EXTERNAL_COLUMNS, "außerhalb DFFL")
    if internal_fix_raw:
        _require_columns(df, INTERNAL_FIX_COLUMNS, "DFFL")

    external_parsed = [
        _parse_external_row(row_number, raw) for row_number, raw in external_raw
    ]
    internal_fix_parsed = [
        _parse_internal_fix_row(row_number, raw) for row_number, raw in internal_fix_raw
    ]

    official_ids = {
        parsed["official_id"]
        for parsed in external_parsed + internal_fix_parsed
        if parsed["official_id"] is not None
    }
    officials_by_id = _resolve_officials_by_id(official_ids)
    existing_keys = _resolve_existing_external_keys(external_parsed)
    associations_by_value = _resolve_associations_by_value(external_parsed)
    matches_by_key = _resolve_game_official_matches(internal_fix_parsed)

    external_suggestions = [
        _build_external_suggestion(
            parsed, officials_by_id, existing_keys, associations_by_value
        )
        for parsed in external_parsed
    ]
    internal_fix_suggestions = [
        _build_internal_fix_suggestion(parsed, officials_by_id, matches_by_key)
        for parsed in internal_fix_parsed
    ]

    return ParsedImportResult(
        external=external_suggestions,
        internal_fix=internal_fix_suggestions,
        unclassified=unclassified,
    )
