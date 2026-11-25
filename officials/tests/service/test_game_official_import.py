import io
from datetime import date, datetime

import openpyxl
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from gamedays.models import Gameinfo, GameOfficial
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.models import Official, OfficialExternalGames
from officials.service.game_official_entries import EXTERNAL_ALLOWED_POSITIONS
from officials.service.game_official_import import (
    BRANCH_COLUMN,
    EXTERNAL_COLUMNS,
    INTERNAL_FIX_COLUMNS,
    ImportColumnError,
    _parse_date_flexible,
    _to_date,
    _to_notification_date,
    _to_position,
    build_import_result,
    parse_uploaded_file,
)
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import OfficialFactory

ALL_HEADERS = [
    "Zeitstempel",
    "E-Mail für Rückfragen",
    "Für welchen Bereich möchtest du einen Einsatz melden?",
    "Wie ist die ID des fehlerhaften Spiels?",
    "Wie ist deine Lizenznummer?",
    "Welche Position?",
    "Sonstiges",
    "Lizenznummer",
    "Anzahl Spiele",
    "Wann hat der Einsatz stattgefunden?",
    "Welche Position?",
    "Unter welchem Verband hat der Einsatz stattgefunden?",
    "Internationales Turnier",
    "Dauer einer Halbzeit?",
    "Mit Clock Control?",
    "Anmerkung - Turniername",
    "Name",
    "E-Mail-Adresse",
]


def _csv_upload(rows, headers=None, filename="import.csv"):
    headers = headers if headers is not None else ALL_HEADERS
    lines = [",".join(f'"{h}"' for h in headers)]
    for row in rows:
        lines.append(",".join(f'"{value}"' for value in row))
    content = "\n".join(lines).encode("utf-8")
    return SimpleUploadedFile(filename, content, content_type="text/csv")


def _xlsx_upload(rows, headers=None, filename="import.xlsx"):
    headers = headers if headers is not None else ALL_HEADERS
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.append(headers)
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return SimpleUploadedFile(
        filename,
        buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def _empty_row():
    return [""] * len(ALL_HEADERS)


def _external_row(
    official_id="",
    number_games="",
    event_date="",
    position="",
    association="",
    is_international="",
    halftime_duration="",
    has_clockcontrol="",
    comment="",
    reporter_name="",
    timestamp="",
    branch="außerhalb DFFL",
):
    row = _empty_row()
    row[0] = timestamp
    row[2] = branch
    row[7] = official_id
    row[8] = number_games
    row[9] = event_date
    row[10] = position
    row[11] = association
    row[12] = is_international
    row[13] = halftime_duration
    row[14] = has_clockcontrol
    row[15] = comment
    row[16] = reporter_name
    return row


def _internal_fix_row(gameinfo_id="", official_id="", position="", branch="DFFL"):
    row = _empty_row()
    row[2] = branch
    row[3] = gameinfo_id
    row[4] = official_id
    row[5] = position
    return row


class TestParseUploadedFile(TestCase):
    def test_reads_csv_and_handles_duplicate_position_header_with_dot_one_suffix(self):
        row = _external_row(official_id="1", position="Referee", association="Hamburg")
        row = _internal_fix_row(gameinfo_id="7", official_id="1", position="Side Judge")
        # Combine both branch columns in a single row to exercise both
        # "Welche Position?" occurrences at once.
        combined = _empty_row()
        combined[3] = "7"
        combined[4] = "1"
        combined[5] = "Side Judge"
        combined[7] = "1"
        combined[10] = "Referee"
        upload = _csv_upload([combined])

        df = parse_uploaded_file(upload)

        assert "Welche Position?" in df.columns
        assert "Welche Position?.1" in df.columns
        first_row = df.iloc[0]
        assert first_row["Welche Position?"] == "Side Judge"
        assert first_row["Welche Position?.1"] == "Referee"

    def test_reads_xlsx_and_handles_duplicate_position_header_with_dot_one_suffix(self):
        combined = _empty_row()
        combined[3] = "7"
        combined[4] = "1"
        combined[5] = "Side Judge"
        combined[7] = "1"
        combined[10] = "Referee"
        upload = _xlsx_upload([combined])

        df = parse_uploaded_file(upload)

        assert "Welche Position?" in df.columns
        assert "Welche Position?.1" in df.columns
        first_row = df.iloc[0]
        assert first_row["Welche Position?"] == "Side Judge"
        assert first_row["Welche Position?.1"] == "Referee"

    def test_unsupported_extension_raises_import_column_error(self):
        upload = SimpleUploadedFile(
            "import.txt", b"anything", content_type="text/plain"
        )
        with pytest.raises(ImportColumnError, match="Dateiformat"):
            parse_uploaded_file(upload)


class TestBranchDetection(TestCase):
    def test_rows_are_split_into_external_internal_fix_and_unclassified(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()

        rows = [
            _external_row(
                official_id=official.pk,
                number_games="2",
                event_date="01.05.2024",
                position="Referee",
                association="Hamburg",
                halftime_duration="20",
            ),
            _internal_fix_row(
                gameinfo_id=gameinfo.pk, official_id=official.pk, position="Referee"
            ),
            _empty_row(),
        ]
        rows[2][2] = "Etwas ganz anderes"
        upload = _csv_upload(rows)
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        assert len(result.external) == 1
        assert len(result.internal_fix) == 1
        assert len(result.unclassified) == 1
        assert result.unclassified[0].reason  # human-readable, non-empty

    def test_ausserhalb_dffl_is_classified_as_external_not_internal_fix(self):
        # "außerhalb DFFL" contains the substring "dffl" too - "außerhalb"
        # must be checked first so this branch isn't misclassified.
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        rows = [
            _external_row(
                official_id=official.pk,
                number_games="2",
                event_date="01.05.2024",
                position="Referee",
                association="Hamburg",
                halftime_duration="20",
                branch="außerhalb DFFL",
            )
        ]
        upload = _csv_upload(rows)
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        assert len(result.external) == 1
        assert len(result.internal_fix) == 0


class TestImportColumnError(TestCase):
    def test_missing_required_external_columns_names_missing_and_found(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        headers = [h for h in ALL_HEADERS if h != "Anzahl Spiele"]
        row = _external_row(
            official_id=official.pk,
            number_games="2",
            event_date="01.05.2024",
            position="Referee",
            association="Hamburg",
            halftime_duration="20",
        )
        del row[ALL_HEADERS.index("Anzahl Spiele")]
        upload = _csv_upload([row], headers=headers)
        df = parse_uploaded_file(upload)

        with pytest.raises(ImportColumnError) as exc_info:
            build_import_result(df)

        message = str(exc_info.value)
        assert "Anzahl Spiele" in message

    def test_missing_required_internal_fix_columns_names_missing_and_found(self):
        headers = [
            h for h in ALL_HEADERS if h != "Wie ist die ID des fehlerhaften Spiels?"
        ]
        row = _internal_fix_row(gameinfo_id="7", official_id="1", position="Referee")
        del row[ALL_HEADERS.index("Wie ist die ID des fehlerhaften Spiels?")]
        upload = _csv_upload([row], headers=headers)
        df = parse_uploaded_file(upload)

        with pytest.raises(ImportColumnError) as exc_info:
            build_import_result(df)

        message = str(exc_info.value)
        assert "fehlerhaften Spiels" in message

    def test_missing_branch_column_entirely_raises(self):
        headers = [h for h in ALL_HEADERS if h != BRANCH_COLUMN]
        upload = _csv_upload([], headers=headers)
        df = parse_uploaded_file(upload)

        with pytest.raises(ImportColumnError):
            build_import_result(df)


class TestDateParsingHandlesXlsxNativeDates(TestCase):
    """.xlsx exports store "Wann hat der Einsatz stattgefunden?" and
    "Zeitstempel" as native Excel date/datetime cells, not the German
    display-format text .csv exports use. parse_uploaded_file() reads
    with dtype=str, which stringifies those cells via Python's default
    str(datetime)/str(Timestamp) representation - "YYYY-MM-DD HH:MM:SS"
    (and "...ffffff" when there are microseconds) - not "DD.MM.YYYY".
    These are the two real values pulled from a production .xlsx export
    that a plain "%d.%m.%Y" strptime format list can't parse."""

    def test_to_date_parses_xlsx_stringified_date_cell(self):
        errors = []

        result = _to_date("2023-06-10 00:00:00", "Einsatzdatum", errors)

        assert result == date(2023, 6, 10)
        assert errors == []

    def test_to_notification_date_parses_xlsx_stringified_timestamp_with_microseconds(
        self,
    ):
        errors = []

        result = _to_notification_date("2023-09-05 03:31:19.233000", errors)

        assert result == date(2023, 9, 5)
        assert errors == []

    def test_to_date_still_parses_german_display_format(self):
        # Regression: the .csv-export format that already worked must
        # keep working once ISO-shaped strings are also accepted.
        errors = []

        result = _to_date("10.06.2023", "Einsatzdatum", errors)

        assert result == date(2023, 6, 10)
        assert errors == []

    def test_to_notification_date_still_parses_german_display_format_with_time(self):
        errors = []

        result = _to_notification_date("05.09.2023 03:31:19", errors)

        assert result == date(2023, 9, 5)
        assert errors == []

    def test_to_date_empty_value_appends_error(self):
        errors = []

        result = _to_date("", "Einsatzdatum", errors)

        assert result is None
        assert "Einsatzdatum fehlt." in errors

    def test_to_notification_date_empty_value_returns_none_without_error(self):
        errors = []

        result = _to_notification_date("", errors)

        assert result is None
        assert errors == []

    def test_to_date_unparseable_value_appends_error(self):
        errors = []

        result = _to_date("not a date", "Einsatzdatum", errors)

        assert result is None
        assert any("Einsatzdatum" in error for error in errors)

    def test_to_notification_date_unparseable_value_appends_error(self):
        errors = []

        result = _to_notification_date("not a date", errors)

        assert result is None
        assert any("Zeitstempel" in error for error in errors)


class TestDateParsingRejectsImplausibleYears(TestCase):
    """The production spreadsheet (5,334 rows, 3 years of history) has 13
    rows with genuinely corrupted year values, e.g. "1/21/0023" instead of
    "1/21/2023". pandas' dayfirst=True fallback parses these "successfully"
    to nonsensical years (23, 225, 26, ...) rather than raising - which
    would let obviously-corrupt data reach status="ready" and get bulk-
    committed. All genuine dates in the real dataset fall in 2023-2026, so
    any parsed year below 2000 is treated as unparsed instead."""

    def test_parse_date_flexible_rejects_two_digit_year_from_corrupted_slash_date(
        self,
    ):
        result = _parse_date_flexible("1/21/0023")

        assert result is None

    def test_parse_date_flexible_rejects_three_digit_year_from_corrupted_slash_date(
        self,
    ):
        result = _parse_date_flexible("5/25/0225")

        assert result is None

    def test_parse_date_flexible_rejects_another_two_digit_year_from_corrupted_slash_date(
        self,
    ):
        result = _parse_date_flexible("2/28/0026")

        assert result is None

    def test_to_date_with_implausible_year_appends_unbekanntes_format_error(self):
        # Confirms the guard is wired through to row-level classification,
        # not just the low-level helper - one example is enough since the
        # other corrupted values all exercise the same code path.
        errors = []

        result = _to_date("1/21/0023", "Einsatzdatum", errors)

        assert result is None
        assert any(
            "Einsatzdatum hat ein unbekanntes Format" in error for error in errors
        )


class TestToPosition(TestCase):
    def test_default_allowed_accepts_the_four_canonical_positions(self):
        for position in ("Referee", "Down Judge", "Field Judge", "Side Judge"):
            errors = []
            assert _to_position(position, errors) == position
            assert errors == []

    def test_default_allowed_rejects_mix(self):
        errors = []

        result = _to_position("Mix", errors)

        assert result == "Mix"
        assert errors == ["Ungültige Position: 'Mix'."]

    def test_external_allowed_positions_accepts_mix(self):
        errors = []

        result = _to_position("Mix", errors, allowed=EXTERNAL_ALLOWED_POSITIONS)

        assert result == "Mix"
        assert errors == []


class TestExternalClassification(TestCase):
    def setUp(self):
        self.association = DbSetupOfficials.create_production_associations()["AFCVHH"]

    def test_valid_row_is_ready_and_included_by_default(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        row = _external_row(
            official_id=official.pk,
            number_games="2",
            event_date="01.05.2024",
            position="Referee",
            association="Hamburg",
            halftime_duration="20",
            is_international="Ja",
            has_clockcontrol="Nein",
            timestamp="05.09.2023 03:31:19",
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.external[0]
        assert suggestion.status == "ready"
        assert suggestion.include_default is True
        assert suggestion.official_id == official.pk
        assert "Fedora" in suggestion.official_display
        assert suggestion.number_games == 2
        assert suggestion.date == date(2024, 5, 1)
        assert suggestion.position == "Referee"
        assert suggestion.association == "Hamburg"
        assert suggestion.halftime_duration == 20
        assert suggestion.is_international is True
        assert suggestion.has_clockcontrol is False

    def test_notification_date_is_extracted_as_date_only_from_timestamp(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        row = _external_row(
            official_id=official.pk,
            number_games="2",
            event_date="01.05.2024",
            position="Referee",
            association="Hamburg",
            halftime_duration="20",
            timestamp="05.09.2023 03:31:19",
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        assert result.external[0].notification_date == date(2023, 9, 5)

    def test_unknown_official_id_is_needs_attention(self):
        row = _external_row(
            official_id="999999",
            number_games="2",
            event_date="01.05.2024",
            position="Referee",
            association="Hamburg",
            halftime_duration="20",
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.external[0]
        assert suggestion.status == "needs_attention"
        assert suggestion.include_default is False
        assert "999999" in suggestion.reason

    def test_unknown_association_is_needs_attention(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        row = _external_row(
            official_id=official.pk,
            number_games="2",
            event_date="01.05.2024",
            position="Referee",
            association="Fantasie-Verband",
            halftime_duration="20",
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.external[0]
        assert suggestion.status == "needs_attention"
        assert suggestion.include_default is False
        assert "Unbekannter Verband" in suggestion.reason

    def test_duplicate_external_row_defaults_unchecked(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        OfficialExternalGames.objects.create(
            official=official,
            number_games=2,
            date=date(2024, 5, 1),
            notification_date=date(2024, 5, 1),
            position="Referee",
            association=self.association,
            halftime_duration=20,
            has_clockcontrol=False,
            is_international=False,
            reporter_name="",
            comment="",
        )
        row = _external_row(
            official_id=official.pk,
            number_games="2",
            event_date="01.05.2024",
            position="Referee",
            association="Hamburg",
            halftime_duration="20",
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.external[0]
        assert suggestion.status == "duplicate"
        assert suggestion.include_default is False

    def test_position_mix_is_ready(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        row = _external_row(
            official_id=official.pk,
            number_games="2",
            event_date="01.05.2024",
            position="Mix",
            association="Hamburg",
            halftime_duration="20",
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.external[0]
        assert suggestion.status == "ready"
        assert suggestion.include_default is True
        assert suggestion.position == "Mix"

    def test_same_official_different_number_games_is_not_a_duplicate(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        OfficialExternalGames.objects.create(
            official=official,
            number_games=2,
            date=date(2024, 5, 1),
            notification_date=date(2024, 5, 1),
            position="Referee",
            association=self.association,
            halftime_duration=20,
            has_clockcontrol=False,
            is_international=False,
            reporter_name="",
            comment="",
        )
        row = _external_row(
            official_id=official.pk,
            number_games="3",
            event_date="01.05.2024",
            position="Referee",
            association="Hamburg",
            halftime_duration="20",
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        assert result.external[0].status == "ready"


class TestExternalClassificationWithXlsxNativeDateCells(TestCase):
    """Regression test for the bug where .xlsx exports store the date
    columns as native Excel date/datetime cells rather than text.
    Unlike the other xlsx-shaped tests in this file, which pass plain
    strings that openpyxl writes as text cells regardless of file
    format, this builds a workbook with genuine datetime.date /
    datetime.datetime typed cells - the shape that reproduced the
    production bug and that the previous test suite never exercised."""

    def setUp(self):
        DbSetupOfficials.create_production_associations()

    def test_row_with_native_date_and_datetime_cells_is_ready(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        row = _external_row(
            official_id=official.pk,
            number_games="2",
            position="Referee",
            association="Hamburg",
            halftime_duration="20",
            is_international="Ja",
            has_clockcontrol="Nein",
        )
        # Overwrite with real date/datetime objects (not string
        # literals) so openpyxl writes them as native Excel date cells,
        # exactly like the real Google Sheet .xlsx export.
        row[ALL_HEADERS.index("Wann hat der Einsatz stattgefunden?")] = date(
            2023, 6, 10
        )
        row[ALL_HEADERS.index("Zeitstempel")] = datetime(2023, 9, 5, 3, 31, 19, 233000)
        upload = _xlsx_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.external[0]
        assert suggestion.status == "ready"
        assert suggestion.reason == ""
        assert suggestion.date == date(2023, 6, 10)
        assert suggestion.notification_date == date(2023, 9, 5)


class TestInternalFixClassification(TestCase):
    def test_zero_matches_proposes_create(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        official = (
            DbSetupOfficials().create_officials_and_team() and Official.objects.first()
        )
        row = _internal_fix_row(
            gameinfo_id=gameinfo.pk, official_id=official.pk, position="Referee"
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.internal_fix[0]
        assert suggestion.action == "create"
        assert suggestion.status == "ready"
        assert suggestion.include_default is True

    def test_one_match_proposes_update_with_current_official_display(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        DBSetup().create_game_officials(gameinfo)
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.last()
        row = _internal_fix_row(
            gameinfo_id=gameinfo.pk, official_id=official.pk, position="Referee"
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.internal_fix[0]
        assert suggestion.action == "update"
        assert suggestion.status == "ready"
        assert suggestion.include_default is True
        # No official was set yet on the existing GameOfficial row.
        assert suggestion.current_official_display

    def test_two_or_more_matches_is_needs_attention_and_unchecked(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        DBSetup().create_game_officials(gameinfo)
        GameOfficial.objects.create(gameinfo=gameinfo, position="Referee")
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        row = _internal_fix_row(
            gameinfo_id=gameinfo.pk, official_id=official.pk, position="Referee"
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.internal_fix[0]
        assert suggestion.status == "needs_attention"
        assert suggestion.include_default is False

    def test_unknown_official_id_is_needs_attention(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        row = _internal_fix_row(
            gameinfo_id=gameinfo.pk, official_id="999999", position="Referee"
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.internal_fix[0]
        assert suggestion.status == "needs_attention"
        assert suggestion.include_default is False

    def test_position_mix_is_rejected_as_needs_attention(self):
        # Regression guard: "Mix" is only valid on the "außerhalb DFFL"
        # external branch (see TestExternalClassification.
        # test_position_mix_is_ready) - the internal-fix branch maps onto
        # GameOfficial.position's fixed 4-slot crew and must keep
        # rejecting anything outside ALLOWED_POSITIONS.
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        official = (
            DbSetupOfficials().create_officials_and_team() and Official.objects.first()
        )
        row = _internal_fix_row(
            gameinfo_id=gameinfo.pk, official_id=official.pk, position="Mix"
        )
        upload = _csv_upload([row])
        df = parse_uploaded_file(upload)

        result = build_import_result(df)

        suggestion = result.internal_fix[0]
        assert suggestion.status == "needs_attention"
        assert suggestion.include_default is False
        assert "Ungültige Position: 'Mix'." in suggestion.reason


class TestQueryCountDoesNotScaleWithRowCount(TestCase):
    def _build_rows(self, gameinfo, officials):
        rows = []
        for official in officials:
            rows.append(
                _external_row(
                    official_id=official.pk,
                    number_games="2",
                    event_date="01.05.2024",
                    position="Referee",
                    association="Hamburg",
                    halftime_duration="20",
                )
            )
            rows.append(
                _internal_fix_row(
                    gameinfo_id=gameinfo.pk,
                    official_id=official.pk,
                    position="Side Judge",
                )
            )
        return rows

    def test_query_count_is_flat_regardless_of_row_count(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        team = TeamFactory(name="Test Team")
        small_officials = [
            OfficialFactory(first_name=f"F{i}", last_name=f"L{i}", team=team)
            for i in range(2)
        ]
        rows_small = self._build_rows(gameinfo, small_officials)
        df_small = parse_uploaded_file(_csv_upload(rows_small))

        with CaptureQueriesContext(connection) as small_ctx:
            build_import_result(df_small)

        large_officials = small_officials + [
            OfficialFactory(first_name=f"F{i}", last_name=f"L{i}", team=team)
            for i in range(2, 20)
        ]
        rows_large = self._build_rows(gameinfo, large_officials)
        df_large = parse_uploaded_file(_csv_upload(rows_large))

        with CaptureQueriesContext(connection) as large_ctx:
            build_import_result(df_large)

        assert len(large_ctx.captured_queries) == len(small_ctx.captured_queries)
