import logging
import pandas as pd
from django.db.models.fields import return_None

logger = logging.getLogger(__name__)

from gamedays.forms import SCHEDULE_CUSTOM_CHOICE_C, GamedayGaminfoFieldsAndGroupsForm
from gamedays.models import Gameinfo, Gameday
from gamedays.service.gameday_settings import (
    ID_AWAY,
    SCHEDULED,
    FIELD,
    OFFICIALS_NAME,
    STAGE,
    STANDING,
    HOME,
    POINTS_HOME,
    POINTS_AWAY,
    AWAY,
    STATUS,
    ID_HOME,
    OFFICIALS,
    TEAM_NAME,
    POINTS,
    PF,
    PA,
    DIFF,
    DFFL,
    GAMEINFO_ID,
    FINISHED,
    CLOCK,
    TIMEOUT,
    GAME_START,
    SECOND_HALF_START,
    OVERTIME,
    GAME_END,
)
from gamedays.service.gamelog import TeamLog, Gameresult
from gamedays.service.model_wrapper import GamedayModelWrapper

EMPTY_DATA = "[]"

TABLE_HEADERS = {
    DFFL: "DFFL-Punkte",
    STANDING: "Gruppe",
    TEAM_NAME: "Team",
    POINTS: "Punkte",
    PF: "PF",
    PA: "PA",
    DIFF: "+/-",
}

SCHEDULE_TABLE_HEADERS = {
    SCHEDULED: "Start",
    FIELD: "Feld",
    HOME: "Heim",
    POINTS_HOME: "Pkt",
    POINTS_AWAY: "Pkt",
    AWAY: "Gast",
    OFFICIALS_NAME: "Officials",
    STANDING: "Platz",
    STAGE: "Runde",
    STATUS: "Status",
    GAMEINFO_ID: "Rückblick",
}


class EmptySchedule:
    @staticmethod
    def to_html(*args, **kwargs):
        return "None"

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyQualifyTable:
    @staticmethod
    def to_html(*args, **kwargs):
        return ""

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyFinalTable:
    @staticmethod
    def to_html(*args, **kwargs):
        return "Abschlusstabelle wird berechnet, sobald alle Spiele beendet sind."

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyOffenseStatisticTable:

    @staticmethod
    def to_html(*args, **kwargs):
        return "Offense Statistiken sind nach dem 1. Spiel verfügbar."

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyDefenseStatisticTable:

    @staticmethod
    def to_html(*args, **kwargs):
        return "Defense Statistiken sind nach dem 1. Spiel verfügbar."

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EventsTableError:
    """Marker for when events table cannot be generated due to data inconsistency"""
    
    def __init__(self, home_team: str, away_team: str, events_teams: list, game_id: int):
        self.home_team = home_team
        self.away_team = away_team
        self.events_teams = events_teams  # teams that actually appear in events
        self.game_id = game_id
        self.error_message = self._build_message()
    
    def _build_message(self) -> str:
        """Build a user-friendly error message"""
        expected = f"{self.home_team} vs {self.away_team}"
        
        if not self.events_teams:
            return f"Ereignisdaten für dieses Spiel sind nicht verfügbar. Bitte kontaktieren Sie den Support."
        
        actual = ", ".join(self.events_teams)
        
        if set(self.events_teams) == {self.home_team, self.away_team}:
            return f"Ereignisdaten für dieses Spiel sind inkonsistent. Erwartet: {expected}, Gefunden: {actual}"
        
        return f"Ereignisdaten für dieses Spiel sind inkonsistent. Erwartet: {expected}, Gefunden: {actual}. Bitte kontaktieren Sie den Support."
    
    def to_html(self, **kwargs) -> str:
        """Return HTML representation (matches DataFrame.to_html() interface)"""
        return self.error_message


class EmptyGamedayService:

    @staticmethod
    def get_schedule(*args, **kwargs):
        return EmptySchedule

    @staticmethod
    def get_games_to_whistle(*args, **kwargs):
        return EmptySchedule

    @staticmethod
    def get_qualify_table():
        return EmptyQualifyTable

    @staticmethod
    def get_final_table():
        return EmptyFinalTable

    @staticmethod
    def get_offense_player_statistics_table():
        return EmptyOffenseStatisticTable

    @staticmethod
    def get_defense_player_statistic_table():
        return EmptyDefenseStatisticTable

    @staticmethod
    def get_resolved_designer_data(gameday_pk):
        gameday = Gameday.objects.get(pk=gameday_pk)
        return gameday.designer_data or {"nodes": [], "edges": []}


class GamedayService:
    @classmethod
    def create(cls, gameday_pk):
        try:
            return cls(gameday_pk)
        except Gameinfo.DoesNotExist:
            return EmptyGamedayService

    def __init__(self, pk):
        self.gmw = GamedayModelWrapper(pk)
        self.gameday_pk = pk

    def get_schedule(self):
        schedule = self.gmw.get_schedule()
        columns = [
            SCHEDULED,
            FIELD,
            HOME,
            POINTS_HOME,
            POINTS_AWAY,
            AWAY,
            OFFICIALS_NAME,
            STANDING,
            STAGE,
            STATUS,
            GAMEINFO_ID,
        ]
        schedule = schedule[columns]
        schedule[OFFICIALS_NAME] = schedule[OFFICIALS_NAME].apply("<i>{}</i>".format)
        schedule[SCHEDULED] = pd.to_datetime(
            schedule[SCHEDULED], format="%H:%M:%S"
        ).dt.strftime("%H:%M")
        schedule[GAMEINFO_ID] = schedule.apply(
            lambda x: (
                self._get_game_detail_button(self.gameday_pk, x.gameinfo)
                if x[STATUS] == FINISHED
                else ""
            ),
            axis=1,
        )
        schedule = schedule.rename(columns=SCHEDULE_TABLE_HEADERS)
        return schedule

    def get_qualify_table(self):
        qualify_table = self.gmw.get_qualify_table()
        if isinstance(qualify_table, str) and qualify_table == "":
            return EmptyQualifyTable
        qualify_table = qualify_table[[STANDING, TEAM_NAME, POINTS, PF, PA, DIFF]]
        qualify_table = qualify_table.rename(columns=TABLE_HEADERS)
        return qualify_table

    def get_final_table(self):
        final_table = self.gmw.get_final_table()
        if final_table.empty:
            return final_table
        final_table = final_table[[TEAM_NAME, POINTS, PF, PA, DIFF]]
        final_table = final_table.rename(columns=TABLE_HEADERS)
        return final_table

    def get_games_to_whistle(self, team):
        if team == "*":
            team = ""
        games_to_whistle = self.gmw.get_games_to_whistle(team)
        columns = [
            SCHEDULED,
            FIELD,
            OFFICIALS,
            OFFICIALS_NAME,
            STAGE,
            STANDING,
            HOME,
            POINTS_HOME,
            POINTS_AWAY,
            AWAY,
            STATUS,
            ID_HOME,
            ID_AWAY,
            "id",
        ]
        games_to_whistle = games_to_whistle[columns]
        games_to_whistle = games_to_whistle.rename(
            columns={OFFICIALS: "officialsId", OFFICIALS_NAME: OFFICIALS}
        )
        return games_to_whistle

    def get_offense_player_statistics_table(self):
        return self.gmw.get_offense_player_statistics_table()

    def get_defense_player_statistic_table(self):
        return self.gmw.get_defense_statistic_table()

    def get_resolved_designer_data(self, gameday_pk=None):
        gameday = Gameday.objects.get(pk=self.gameday_pk)
        data = gameday.designer_data or {"nodes": [], "edges": []}

        # Cache results for this gameday to avoid repeated queries
        from gamedays.models import Gameresult

        results = Gameresult.objects.filter(gameinfo__gameday=gameday)
        games = Gameinfo.objects.filter(gameday=gameday)

        def resolve_team(ref):
            if not ref or not isinstance(ref, dict):
                return None
            target_match = ref.get("matchName")
            ref_type = ref.get("type")  # 'winner' or 'loser'

            target_game = games.filter(standing=target_match).first()
            if not target_game or target_game.status != Gameinfo.STATUS_COMPLETED:
                return None

            game_results = results.filter(gameinfo=target_game).order_by("isHome")
            if len(game_results) < 2:
                return None

            home = game_results.filter(isHome=True).first()
            away = game_results.filter(isHome=False).first()

            if not home or not away:
                return None

            home_score = target_game.final_score.get("home", 0)
            away_score = target_game.final_score.get("away", 0)

            winner = home if home_score > away_score else away
            loser = away if home_score > away_score else home

            if home_score == away_score:
                return "Tie"

            resolved_team = winner if ref_type == "winner" else loser
            return resolved_team.team.name

        for node in data.get("nodes", []):
            if node.get("type") == "game":
                node_data = node.get("data", {})
                home_ref = node_data.get("homeTeamDynamic")
                away_ref = node_data.get("awayTeamDynamic")

                if home_ref:
                    node_data["resolvedHomeTeam"] = resolve_team(home_ref)
                if away_ref:
                    node_data["resolvedAwayTeam"] = resolve_team(away_ref)

        return data

    @staticmethod
    def update_format(gameday, data):
        if (
            data.get(GamedayGaminfoFieldsAndGroupsForm.FORMAT_C)
            == SCHEDULE_CUSTOM_CHOICE_C
        ):
            gameday.format = f"{gameday.league.name}_Gruppen{data[GamedayGaminfoFieldsAndGroupsForm.NUMBER_GROUPS_C]}_Felder{data[GamedayGaminfoFieldsAndGroupsForm.NUMBER_FIELDS_C]}"
        else:
            gameday.format = data.get(GamedayGaminfoFieldsAndGroupsForm.FORMAT_C)
        gameday.save()

    @staticmethod
    def _get_game_detail_button(gameday_pk: int, gameinfo_id: int):
        return f"""<a href="game/{gameinfo_id}" class="btn btn-primary">Zum Spiel<i class="bi bi-chevron-right"></i></a>"""


class EmptySplitScoreTable:

    @staticmethod
    def to_html(*args, **kwargs):
        return "Leider gibt es keine Daten."

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyEventsTable:

    @staticmethod
    def to_html(*args, **kwargs):
        return "Leider gibt es keine Daten."

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyGamedayGameService:

    @staticmethod
    def get_split_score_table() -> (pd.DataFrame, bool):
        return EmptySplitScoreTable, True

    @staticmethod
    def get_events_table() -> pd.DataFrame:
        return EmptyEventsTable


class GamedayGameService:
    @classmethod
    def create(cls, game_pk):
        try:
            return cls(game_pk)
        except Gameinfo.DoesNotExist:
            return EmptyGamedayGameService

    def __init__(self, pk):
        self.game = Gameinfo.objects.get(pk=pk)
        self.gameresult = pd.DataFrame(
            Gameresult.objects.filter(gameinfo=pk)
            .order_by("isHome")
            .values("team__description", "team", "isHome")
        )

        self.events = pd.DataFrame(
            TeamLog.objects.filter(gameinfo=self.game.pk)
            .exclude(isDeleted=True)
            .order_by("created_time")
            .values(*[x.name for x in TeamLog._meta.local_fields], "team__description")
        )

        self.events_ready = False

        if len(self.events) > 0:
            self.events_ready = True
            self.events = self._prepare_team_logs()

        self.home_team_name = "Home Team"
        self.home_team_id = 0
        self.away_team_name = "Away Team"
        self.away_team_id = 0

        if len(self.gameresult) > 0:
            self.home_team_name = self.gameresult.iloc[1]["team__description"]
            self.home_team_id = self.gameresult.iloc[1]["team"]
            self.away_team_name = self.gameresult.iloc[0]["team__description"]
            self.away_team_id = self.gameresult.iloc[0]["team"]

        self._score_column_mapping = {
            # "created_time": "Zeit",
            self.home_team_name: self.home_team_name,
            "input": "Spielstand",
            self.away_team_name: self.away_team_name,
        }

        self._split_score_column_mapping = {
            "team__description": "Team",
            1: "1. Halbzeit",
            2: "2. Halbzeit",
            "final": "Endstand",
        }

        self.score_output_columns = self._score_column_mapping.values()
        self.split_score_output_columns = self._split_score_column_mapping.values()

    def _prepare_team_logs(self):
        events = self.events

        misc_events = [CLOCK, GAME_START, SECOND_HALF_START, OVERTIME, GAME_END]

        # events.input = events.apply(lambda x: )
        events.team = events.apply(
            lambda x: None if x.event in misc_events else x.event, axis=1
        )
        events.event = events.apply(self._format_event, axis=1)

        events.player = events.player.apply(
            lambda x: "" if pd.isna(x) else f"#{str(int(x))}"
        )
        # events.input = events.input.apply(lambda x: '' if pd.isna(x) else f": {x}")
        events["is_scoring_play"] = events.value > 0
        events["event_with_player"] = events.apply(
            self._format_event_with_player, axis=1
        )
        return events

    @staticmethod
    def _format_event_with_player(row: pd.Series) -> str:
        if row.event in ["1-Extra-Punkt", "2-Extra-Punkte"] and row.value == 0:
            return f"<s>{row.event}</s>"

        row_input = "" if pd.isna(row.input) else row.input

        if row.event == TIMEOUT:
            return f"{row.event.strip()} @ {GamedayGameService._format_time_string(row.input)}"

        return f"{row.event} {row.player} {row_input}"

    @staticmethod
    def _format_event(row: pd.Series) -> str:
        if row.event == CLOCK:
            return f"{row.event}: {GamedayGameService._format_time_string(row.input)}"

        if row.event in [GAME_START, SECOND_HALF_START, OVERTIME, GAME_END]:
            return f"<b>{row.event}</b>"

        return row.event

    @staticmethod
    def _format_time_string(time_string: str) -> str:
        if ":" not in time_string:
            return time_string

        parts = time_string.split(":")
        return ":".join([parts[0], f"{parts[-1]:0>2}"])

    def get_split_score_table(self) -> (pd.DataFrame, bool):
        if not self.events_ready:
            return EmptySplitScoreTable, True

        events = self.events.copy()
        split_score_repaired = False

        ct = pd.crosstab(
            events.team__description, events.half, events.value, aggfunc="sum"
        )
        ct["final"] = ct.sum(axis=1)
        ct = ct.rename_axis(None, axis=1).reset_index()

        if len(ct.columns) != 4:
            ct = self._repair_broken_split_score(ct)
            split_score_repaired = True

        return (
            ct.rename(columns=self._split_score_column_mapping)[
                self.split_score_output_columns
            ],
            split_score_repaired,
        )

    def _repair_broken_split_score(self, split_score_ct: pd.DataFrame) -> pd.DataFrame:
        split_score_columns = set(split_score_ct.columns)
        missing_columns = (
            set(self._split_score_column_mapping.keys()) - split_score_columns
        )

        for col_name in missing_columns:
            split_score_ct[col_name] = 0

        return split_score_ct

    def _validate_events_data(self, team_events) -> tuple[bool, list]:
        """
        Validate that event data contains expected teams.
        
        Returns:
            (is_valid, teams_in_events) - tuple of (bool, list of team names)
        """
        if team_events.empty:
            return False, []
        
        teams_in_events = team_events['team__description'].unique().tolist()
        expected_teams = {self.home_team_name, self.away_team_name}
        actual_teams = set(teams_in_events)
        
        # Check if actual teams don't match expected
        if actual_teams != expected_teams:
            logger.warning(
                f"Events data mismatch for game {self.game.pk}: "
                f"Expected {expected_teams}, got {actual_teams}"
            )
            return False, teams_in_events
        
        return True, teams_in_events

    def get_events_table(self):
        if not self.events_ready:
            return EmptyEventsTable
        events = self.events.copy()

        static_events = events[pd.isna(events.team)].copy()
        team_events = events[~pd.isna(events.team)].copy()

        # NEW: Validate data before processing
        is_valid, teams_in_events = self._validate_events_data(team_events)
        if not is_valid:
            logger.error(
                f"Cannot generate events table for game {self.game.pk} - "
                f"event teams {teams_in_events} don't match expected "
                f"{self.home_team_name} vs {self.away_team_name}. "
                f"Game ID: {self.game.pk}, Gameday ID: {self.game.gameday.pk}"
            )
            return EventsTableError(
                home_team=self.home_team_name,
                away_team=self.away_team_name,
                events_teams=teams_in_events,
                game_id=self.game.pk
            )

        event_ct = pd.crosstab(
            index=team_events.id,
            columns=team_events.team__description,
            values=team_events.event_with_player,
            aggfunc="first",
        ).fillna("")

        event_ct = event_ct.merge(
            right=team_events[["id", "created_time", "player"]],
            left_index=True,
            right_on="id",
        )

        scores_ct = pd.crosstab(
            team_events.id,
            team_events.team__description,
            values=team_events.value,
            aggfunc="sum",
        )
        scores_ct = scores_ct.fillna(0).astype(int).cumsum().ffill()
        scores_ct["score"] = scores_ct.apply(
            lambda x: f"{x[self.home_team_name]}:{x[self.away_team_name]}", axis=1
        )
        scores_ct["previous_score"] = scores_ct.score != scores_ct.score.shift(1)
        scores_ct.score = scores_ct.apply(
            lambda x: x.score if x.previous_score else "", axis=1
        )

        event_ct = event_ct.merge(
            right=scores_ct[["score"]],
            left_on="id",
            right_index=True,
            suffixes=("", ""),
        )

        event_ct = (
            pd.concat(
                objs=[
                    event_ct,
                    static_events[["id", "created_time", "event"]].rename(
                        columns={"event": "input"}
                    ),
                ]
            )
            .fillna("")
            .sort_values("id")
        )

        event_ct.input = event_ct.apply(
            lambda x: x.input if len(x.input) > 0 else x.score, axis=1
        )
        event_ct.created_time = event_ct.created_time.apply(
            lambda x: x.strftime("%H:%M")
        )

        return event_ct.rename(columns=self._score_column_mapping)[
            self.score_output_columns
        ]
