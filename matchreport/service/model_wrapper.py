from datetime import timedelta

import pandas as pd
from django.db.models import OuterRef, Subquery
from django.urls import reverse
from django.utils.html import escape, format_html
from django.utils.safestring import mark_safe

from league_manager.utils.html import escape_cell

from gamedays.models import (
    Gameinfo,
    GameSetup,
    Person,
    Gameresult,
    GameOfficial,
    TeamLog,
)
from officials.models import OfficialLicenseHistory
from officials.service.license_validity import validity_lower_bound
from passcheck.models import PasscheckVerification, PlayerlistGameday

# Global (unnamespaced) self-service URL names - the claim/unassign views
# themselves live in officials/selfservice.py; this report only links to them.
SELF_SERVICE_CLAIM_URL_NAME = "view-officials-selfservice-claim"
SELF_SERVICE_UNASSIGN_URL_NAME = "view-officials-selfservice-unassign"

PLAYER_PASSCHECK_COLUMN_MAPPING = {
    "gameday_jersey": "Trikotnr.",
    "playerlist__team__description": "Spieler Team",
    "playerlist__player__pass_number": "Passnummer",
    "playerlist__player__person__first_name": "Vorname",
    "playerlist__player__person__last_name": "Nachname",
    "playerlist__player__person__year_of_birth": "Geburtsdatum",
    "playerlist__player__person__sex": "Geschlecht",
}


class MachtreportModelWrapper:

    def __init__(self, pk):
        gameinfo_qs = Gameinfo.objects.filter(gameday_id=pk)
        gameinfo_data = gameinfo_qs.values(
            # select the fields which should be in the dataframe
            *(
                [f.name for f in Gameinfo._meta.local_fields]
                + ["officials__name", "gameday__date"]
            )
        )
        self._gameinfo: pd.DataFrame = pd.DataFrame(gameinfo_data)
        if self._gameinfo.empty:
            raise Gameinfo.DoesNotExist

        self.gameday_pk = self._gameinfo.iloc[0]["gameday"]
        self.gameday_date = pd.Timestamp(self._gameinfo.iloc[0]["gameday__date"]).date()
        self.passcheck_player_details_df = self._get_gameday_passcheck_details()

    def get_staff_passcheck_details(self):
        column_mapping = {
            "created_at": "Zeitpunkt",
            "official_name": "Schiedsrichter",
            "user__username": "Account",
            "team__name": "Team",
            "note": "Notiz",
        }

        passchecks = pd.DataFrame(
            PasscheckVerification.objects.filter(gameday_id=self.gameday_pk).values(
                *column_mapping.keys()
            )
        )

        if passchecks.empty:
            return pd.DataFrame([], columns=column_mapping.values())

        passchecks["created_at"] = passchecks.created_at.dt.strftime(
            "%Y-%m-%d %H:%M:%S"
        )
        # Rendered with escape=False to keep the note's <br> markup, so every
        # other free-text column is escaped by hand here.
        for column in ("official_name", "user__username", "team__name"):
            passchecks[column] = passchecks[column].apply(escape_cell)
        passchecks["note"] = passchecks.note.apply(
            lambda note: mark_safe("<br>".join(escape_cell(note).splitlines()))
        )

        return passchecks.rename(columns=column_mapping)

    def get_gameday_passcheck_team_players_dict(self) -> dict:
        output_dict = {}

        for team_name, df in self.passcheck_player_details_df.groupby(
            "playerlist__team__description"
        ):
            output_dict[team_name] = {
                "num_players": len(df),
                "player_table": df.rename(columns=PLAYER_PASSCHECK_COLUMN_MAPPING),
            }

        return output_dict

    def _get_gameday_passcheck_details(self):

        pass_check_players = pd.DataFrame(
            PlayerlistGameday.objects.filter(gameday_id=self.gameday_pk).values(
                *PLAYER_PASSCHECK_COLUMN_MAPPING.keys()
            )
        )
        if pass_check_players.empty:
            # For youth leagues there are no pass checks therefore we can't return anything here.
            return pd.DataFrame(
                [], columns=list(PLAYER_PASSCHECK_COLUMN_MAPPING.keys())
            )

        sex_mapping_dict = {k: v for (k, v) in Person.SEX_CHOICES}

        pass_check_players.playerlist__player__person__sex = (
            pass_check_players.playerlist__player__person__sex.apply(
                lambda x: sex_mapping_dict.get(x, "NA")
            )
        )

        return pass_check_players

    def get_gameday_passcheck_player_list(self) -> pd.DataFrame:
        return self.passcheck_player_details_df.rename(
            columns=PLAYER_PASSCHECK_COLUMN_MAPPING
        ).sort_values(["Spieler Team", "Trikotnr."])

    def _get_staff_game_end_notes(self, gameinfo: str):
        return (
            GameSetup.objects.filter(gameinfo=gameinfo)
            .values(
                *[
                    "gameinfo__officials__name",
                    "homeCaptain",
                    "awayCaptain",
                    "note",
                ]
            )
            .first()
        )

    def _get_game_result(self, gameinfo: str):
        game_end_info = pd.DataFrame(
            Gameresult.objects.filter(gameinfo=gameinfo).values(
                *[
                    "gameinfo_id",
                    "fh",
                    "sh",
                    "isHome",
                    "team__description",
                    "gameinfo__status",
                    "gameinfo__officials__name",
                    "gameinfo__field",
                    "gameinfo__scheduled",
                ]
            )
        )

        data = {"home": {}, "away": {}}

        for prefix, isHome in [("home", True), ("away", False)]:
            data[prefix]["points_scored"] = (
                game_end_info[game_end_info["isHome"] == isHome][["fh", "sh"]]
                .sum(axis=1)
                .values[0]
            )
            data[prefix]["team_name"] = game_end_info[
                game_end_info["isHome"] == isHome
            ]["team__description"].values[0]
            data["officials"] = game_end_info[game_end_info["isHome"] == isHome][
                "gameinfo__officials__name"
            ].values[0]
            data["game_status"] = game_end_info[game_end_info["isHome"] == isHome][
                "gameinfo__status"
            ].values[0]
            data["field"] = game_end_info[game_end_info["isHome"] == isHome][
                "gameinfo__field"
            ].values[0]
            data["scheduled"] = game_end_info[game_end_info["isHome"] == isHome][
                "gameinfo__scheduled"
            ].values[0]
            data["gameinfo_id"] = game_end_info[game_end_info["isHome"] == isHome][
                "gameinfo_id"
            ].values[0]
        return data

    def _get_game_teamlogs(self, gameinfo: str):
        column_mapping = {
            "team__description": "Team",
            "player": "Trikotnr.",
            "created_time": "Zeipunkt",
            "input": "Strafe",
        }

        teamlogs = pd.DataFrame(
            TeamLog.objects.filter(
                gameinfo=gameinfo, isDeleted=False, event="Strafe"
            ).values(*column_mapping.keys())
        )

        if teamlogs.empty:
            return pd.DataFrame([], columns=list(column_mapping.values()))

        teamlogs.created_time = teamlogs.created_time.apply(
            lambda x: x.strftime("%H:%M:%S")
        )

        return teamlogs.rename(columns=column_mapping)

    def _get_game_officials_table(self, gameinfo: str):
        column_mapping = {
            "official__team__description": "Team",
            "name": "Name",
            "position": "Position",
            "license_cell": "Lizenz",
            "license_number_cell": "Lizenznummer",
            "action_cell": "Aktion",
        }
        # Not part of column_mapping directly - fetched alongside it but
        # consumed by _license_number_cell()/_license_cell() and
        # _official_action_cell() to build the "Lizenznummer"/"Lizenz"/
        # "Aktion" columns, not rendered as columns of their own.
        extra_fields = ["official_id", "id"]

        # Correlated subquery so every official's license is resolved in the
        # same query as the officials table, instead of one query per
        # official (N+1). A license is valid on the gameday if the gameday
        # falls within the license validity period: training date (created_at)
        # to approximately one year later (created_at + 365 days), as defined
        # by OfficialLicenseHistory.valid_until() - validity_lower_bound()
        # shares this window with
        # officials/service/officials_compliance_service.py so the two can't
        # independently drift apart. When more than one license is valid at
        # once, the highest-ranked one wins (F1 over F2 over F3...) - never
        # whichever was issued more recently, so no date field is passed to
        # order_by_rank() here.
        latest_license = (
            OfficialLicenseHistory.objects.filter(
                official_id=OuterRef("official"),
                created_at__lte=self.gameday_date,
                created_at__gt=validity_lower_bound(self.gameday_date),
            )
            .order_by_rank()
            .values("license__name")[:1]
        )
        # When there's no currently valid license, this resolves the most
        # recently *started* one as of the gameday (regardless of whether
        # it's still valid) so the "Lizenz" cell can show when it expired,
        # instead of just going blank. Ordered by recency, not rank - this
        # is "what did they last hold", not "what's their best license".
        last_started_license_date = (
            OfficialLicenseHistory.objects.filter(
                official_id=OuterRef("official"),
                created_at__lte=self.gameday_date,
            )
            .order_by("-created_at")
            .values("created_at")[:1]
        )

        position_order = {
            "Referee": 0,
            "Down Judge": 1,
            "Field Judge": 2,
            "Side Judge": 3,
            "Scorecard Judge": 4,
        }

        # Raw DB fields to select - column_mapping's "license_cell"/
        # "license_number_cell" keys are computed columns built below, not
        # real fields, so they are deliberately left out of this values()
        # call.
        db_fields = [
            "official__team__description",
            "name",
            "position",
            "latest_license",
            "last_started_license_date",
        ]

        officials_df = pd.DataFrame(
            GameOfficial.objects.filter(gameinfo=gameinfo)
            .annotate(
                latest_license=Subquery(latest_license),
                last_started_license_date=Subquery(last_started_license_date),
            )
            .values(*db_fields, *extra_fields)
        )

        if not officials_df.empty:
            officials_df["order"] = officials_df.position.apply(position_order.get)
            officials_df.sort_values("order", ascending=True, inplace=True)
            officials_df.drop(columns=["order"], inplace=True)
            # Rendered with escape=False for the license cells' markup, so
            # every other free-text column is escaped by hand here.
            for column in ("official__team__description", "name", "position"):
                officials_df[column] = officials_df[column].apply(escape_cell)
            officials_df["license_cell"] = officials_df.apply(
                lambda row: self._license_cell(
                    row["latest_license"], row["last_started_license_date"]
                ),
                axis=1,
            )
            officials_df["license_number_cell"] = officials_df.apply(
                lambda row: self._license_number_cell(
                    row["official_id"],
                    self.gameday_date.year,
                ),
                axis=1,
            )
            officials_df["action_cell"] = officials_df.apply(
                lambda row: self._official_action_cell(
                    row["id"],
                    row["official_id"],
                ),
                axis=1,
            )
            officials_df.drop(
                columns=[*extra_fields, "latest_license", "last_started_license_date"],
                inplace=True,
            )

        return officials_df.rename(columns=column_mapping)

    @staticmethod
    def _license_cell(license_name, last_started_license_date):
        # Plain text, never a hyperlink (see _license_number_cell for the
        # link, which lives in the separate "Lizenznummer" column).
        #
        # pd.isna() rather than "is not None": pandas is pinned to 3.0.5,
        # where pd.options.future.infer_string defaults to True, so an
        # all-string column - like this one, sourced from a license__name
        # CharField subquery - is inferred as pandas StringDtype, whose
        # missing-value sentinel is pd.NA, not Python None or float('nan').
        # `pd.NA is not None` evaluates True, so an "is not None" guard
        # would wrongly treat "no currently valid license" (pd.NA) as a
        # real license name and return pd.NA itself, which to_html() then
        # renders as the literal text "NaN". pd.isna() is the one check
        # that's True for pd.NA, NaN, and None alike, mirroring
        # _license_number_cell()'s existing guard below.
        if not pd.isna(license_name):
            return escape(license_name)

        # No currently valid license - if the official has ever held one
        # that had already started as of this gameday, show when it expired
        # (light grey, italic) instead of leaving the cell blank. This is
        # only shown here, on the gameday detail screen - the CSV export
        # (matchreport/service/gameday_list_csv_service.py, via
        # officials/service/game_official_licenses.py) intentionally stays
        # a separate, simpler implementation with no such note.
        if last_started_license_date is None or pd.isna(last_started_license_date):
            # "" rather than None: this column is rendered via
            # DataFrame.to_html() (REPORT_TABLE_RENDER_CONFIG), which shows
            # a bare None as the literal text "NaN" (once the column also
            # holds a real license string) or "None" (when every official in
            # the game lacks one) instead of a blank cell - see
            # matchreport/tests/test_model_wrapper.py's
            # *_does_not_render_as_the_text_nan regression tests.
            return ""

        expired_on = pd.Timestamp(last_started_license_date).date() + timedelta(
            days=365
        )
        return format_html(
            '<span class="text-muted fst-italic">abgelaufen seit {}</span>',
            expired_on.strftime("%d.%m.%Y"),
        )

    @staticmethod
    def _license_number_cell(official_id, season):
        # The official's license number is their own pk (Official.id) -
        # matching the convention used everywhere else this is shown
        # (officials/templates/officials/license_check.html's "Lizenznr"
        # column, profile_license.html's "Lizenz: #{{official_info.id}}",
        # officials_list.html, _statistics_table.html,
        # association_list.html), and matching what
        # officials/service/moodle/moodle_api.py's ApiUpdateUser writes back
        # into Moodle's own license-number custom field
        # (license_number = official.pk, asserted in
        # officials/tests/service/moodle/test_moodle_service.py). This is
        # NOT Official.external_id - that's a separate, free-text,
        # Moodle-issued account id used only for Moodle account
        # lookup/login mapping and the "External-ID" Moodle-profile-link
        # column, a genuinely different purpose (see
        # officials/service/moodle/moodle_service.py) - do not resurrect it
        # here. Hyperlinked to the official's per-season game list page via
        # the shared officials.service.official_profile helper (also used
        # by officials/service/moodle/moodle_service.py::_get_ahref_for_profile
        # so the links can't drift apart). Shown independently of whether
        # the official currently holds a valid F1-F4 license (that's the
        # separate "Lizenz" column) so staff can always click through to an
        # assigned official's profile.
        if pd.isna(official_id):
            # "" rather than None - see the matching comment in
            # _license_cell() above.
            return ""

        # GameOfficial.official is nullable, so a column mixing real ids
        # with missing values gets upcast by pandas to float64 (121 ->
        # 121.0) - cast back to int before reverse(), whose int converter
        # regex ([0-9]+) rejects the "121.0" string a float would produce.
        official_id = int(official_id)

        # Local import avoids a hard officials<->matchreport import-order
        # dependency at module load time.
        from officials.service.official_profile import official_profile_gamelist_url

        profile_url = official_profile_gamelist_url(official_id, season)
        # official_id has been through int(), so there is no free text left
        # to sanitize; format_html() escapes the url anyway.
        return format_html(
            '<a href="{}" target="_blank" title="Zum Profil des Offiziellen">#{}</a>',
            profile_url,
            official_id,
        )

    @staticmethod
    def _official_action_cell(game_official_id, official_id):
        # "Aktion" column of the officials table, which reaches the template
        # via |safe. Both URLs are resolved with reverse() from the GameOfficial
        # row's own pk - the write logic stays in the self-service views. The
        # free-text GameOfficial.name never enters this cell, so there is no
        # injection path from it; format_html() still escapes the URLs.
        game_official_id = int(game_official_id)
        claim_url = reverse(
            SELF_SERVICE_CLAIM_URL_NAME, kwargs={"pk": game_official_id}
        )
        links = [
            format_html(
                '<a class="btn btn-sm btn-outline-primary" href="{}">Zuordnen</a>',
                claim_url,
            )
        ]
        if not pd.isna(official_id):
            # Only an assigned row can be unassigned; a free-text-only entry
            # has no official to clear.
            unassign_url = reverse(
                SELF_SERVICE_UNASSIGN_URL_NAME, kwargs={"pk": game_official_id}
            )
            links.append(
                format_html(
                    '<a class="btn btn-sm btn-outline-danger" href="{}">'
                    "Zuordnung aufheben</a>",
                    unassign_url,
                )
            )
        # str.join drops SafeString's safety marker, so restore it before the
        # cell is handed to pandas' to_html(escape=False).
        return mark_safe(" ".join(str(link) for link in links))

    def get_gameday_match_report(self, render_config: dict):
        games = []

        no_flags_text = """<p>In diesem Spiel gab es keine Strafen</p>"""
        # No column here contains markup (unlike "refs"), so it can override
        # the shared config's escape=False.
        flags_render_config = {**render_config, "escape": True}

        for gameinfo in self._gameinfo.id:
            end_notes = self._get_staff_game_end_notes(gameinfo)
            game_result = self._get_game_result(gameinfo)
            game_refs = self._get_game_officials_table(gameinfo)
            game_flags = self._get_game_teamlogs(gameinfo)

            games.append(
                {
                    **game_result,
                    "end_notes": end_notes,
                    "refs": game_refs.to_html(**render_config),
                    "flags": (
                        game_flags.to_html(**flags_render_config)
                        if not game_flags.empty
                        else no_flags_text
                    ),
                    "num_flags": len(game_flags),
                }
            )

        return games
