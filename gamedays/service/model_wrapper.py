import numpy as np
import pandas as pd
from django.apps import apps
from django.core.exceptions import ObjectDoesNotExist
from pandas import DataFrame

from gamedays.models import Gameinfo, Gameresult, TeamLog
from gamedays.service.gameday_settings import (
    STANDING,
    TEAM_DESCRIPTION,
    POINTS,
    WIN_POINTS,
    POINTS_HOME,
    POINTS_AWAY,
    PA,
    PF,
    GAMEINFO_ID,
    DIFF,
    SCHEDULED,
    FIELD,
    OFFICIALS_NAME,
    STAGE,
    STAGE_CATEGORY,
    HOME,
    AWAY,
    ID_AWAY,
    ID_HOME,
    ID_Y,
    STATUS,
    SH,
    FH,
    FINISHED,
    GAME_FINISHED,
    IN_POSSESSION,
    IS_HOME,
    TEAM_ID,
)
from gamedays.service.stage_category import StageCategory
from gamedays.service.placeholder_service import GamedayPlaceholderService
from league_table.models import LeagueSeasonConfig, LeagueRuleset
from league_table.service.datatypes import LeagueConfigRuleset, LeagueConfig
from league_table.service.leaguetable_settings import TOP_N_PLAYER, SHOW_PLAYER_NAMES
from league_table.service.ranking.engine import (
    FinalRankingEngine,
    TieBreakerEngine,
)
from passcheck.models import PasscheckVerification, PlayerlistGameday


class DfflPoints(object):

    @classmethod
    def for_number_teams(cls, number_of_teams):
        dffl_points = [0] * number_of_teams
        if number_of_teams == 3:
            dffl_points = [6, 4, 2]
        if number_of_teams == 4:
            dffl_points = [8, 6, 4, 2]
        if number_of_teams == 5:
            dffl_points = [10, 8, 6, 4, 2]
        if number_of_teams == 6:
            dffl_points = [11, 9, 7, 5, 3, 2]
        if number_of_teams == 7:
            dffl_points = [12, 10, 8, 6, 4, 3, 2]
        if number_of_teams == 8:
            dffl_points = [13, 11, 9, 7, 5, 4, 3, 2]
        if number_of_teams == 9:
            dffl_points = [14, 12, 10, 8, 6, 5, 4, 3, 2]
        return dffl_points


class GamedayModelWrapper:

    def __init__(self, pk, additional_columns=[]):
        gameinfo = Gameinfo.objects.select_related('gameday__league', 'gameday__season').filter(gameday_id=pk)
        if not gameinfo.exists():
            raise Gameinfo.DoesNotExist
        self.gameday = gameinfo.first().gameday
        self._gameinfo: DataFrame = pd.DataFrame(gameinfo.values(
                # select the fields which should be in the dataframe
                *(
                    [f.name for f in Gameinfo._meta.local_fields]
                    + ["officials__name"]
                    + additional_columns
                )
            )
        )
        if self._gameinfo.empty:
            raise Gameinfo.DoesNotExist

        gameresult = pd.DataFrame(
            Gameresult.objects.filter(gameinfo_id__in=self._gameinfo['id']).order_by('-' + IS_HOME).values(
                *([f.name for f in Gameresult._meta.local_fields] + [TEAM_DESCRIPTION, TEAM_ID])))
        if gameresult.empty:
            self._games_with_result: DataFrame = pd.DataFrame()
            return
        games_with_result = pd.merge(self._gameinfo, gameresult, left_on='id', right_on=GAMEINFO_ID)
        games_with_result[IN_POSSESSION] = games_with_result[IN_POSSESSION].astype(str)
        games_with_result = games_with_result.convert_dtypes()
        games_with_result = games_with_result.astype(
            {FH: "Int64", SH: "Int64", PA: "Int64"}
        )
        games_with_result[PF] = games_with_result[FH] + games_with_result[SH]
        games_with_result[DIFF] = games_with_result[PF] - games_with_result[PA]
        tmp = games_with_result.fillna({PF: 0, PA: 0, FH: 0, SH: 0})
        tmp[POINTS] = np.where(
            tmp[STATUS] == FINISHED,
            np.where(tmp[PF] == tmp[PA], 1, np.where(tmp[PF] > tmp[PA], 2, 0)),
            0,
        )
        games_with_result[POINTS] = tmp[POINTS]
        self._games_with_result: DataFrame = games_with_result
        self._resolve_placeholders()

        self.league_season_config = None
        self.league_season_ruleset = None
        try:
            self.league_season_config = LeagueSeasonConfig.objects.get(
                league=self.gameday.league, season=self.gameday.season
            )
            self.league_season_ruleset = self.league_season_config.ruleset
        except LeagueSeasonConfig.DoesNotExist:
            self.league_season_config = None
        except LeagueRuleset.DoesNotExist:
            try:
                self.league_season_ruleset = LeagueRuleset.objects.get(pk=2)
            except LeagueRuleset.DoesNotExist:
                self.league_season_ruleset = None

    def _resolve_placeholders(self):
        if (
            self._games_with_result.empty
            or TEAM_DESCRIPTION not in self._games_with_result.columns
        ):
            return

        # Only proceed if there are missing team names
        if self._games_with_result[TEAM_DESCRIPTION].isna().any():

            placeholder_service = GamedayPlaceholderService(self._gameinfo['gameday'].iloc[0])

            # Resolve each missing row
            for index, row in self._games_with_result[
                self._games_with_result[TEAM_DESCRIPTION].isna()
            ].iterrows():
                placeholder = placeholder_service.get_placeholder(
                    row[GAMEINFO_ID], is_home=row[IS_HOME]
                )
                self._games_with_result.at[index, TEAM_DESCRIPTION] = placeholder

    def get_staff_passcheck_details(self, gameday_id):
        column_mapping = {
            "created_at": "Zeitpunkt",
            "official_name": "Schiedsrichter",
            "user__username": "Account",
            "team__description": "Team",
            "note": "Notiz",
        }

        passchecks = pd.DataFrame(
            PasscheckVerification.objects.filter(gameday_id=gameday_id).values(
                *column_mapping.keys()
            )
        )

        if passchecks.empty:
            return pd.DataFrame([], columns=column_mapping.values())

        passchecks["created_at"] = passchecks.created_at.dt.strftime(
            "%Y-%m-%d %H:%M:%S"
        )
        passchecks["note"] = passchecks.note.apply(lambda x: x.replace("\n", "</br>"))

        return passchecks.rename(columns=column_mapping)

    def has_finalround(self):
        return (
            self._gameinfo[STAGE_CATEGORY]
            .isin([StageCategory.FINAL, StageCategory.PLACEMENT])
            .any()
        )

    def get_schedule(self):
        schedule = self._get_schedule()
        schedule = schedule.sort_values(by=[SCHEDULED, FIELD])
        return schedule

    def get_qualify_table(self):
        qualify_round = self._get_table()
        if not apps.is_installed("league_table"):
            return qualify_round

        if self.league_season_ruleset is None:
            return qualify_round

        league_config_ruleset = LeagueConfigRuleset.from_ruleset(self.league_season_ruleset)
        engine = TieBreakerEngine(league_config_ruleset)
        # TODO
        # qualify_round["win_quotient"] = qualify_round["points"]
        games_with_result = self._games_with_result
        games_with_result["gameinfo__status"] = games_with_result[STATUS]
        games_with_result = games_with_result[
            games_with_result[STAGE_CATEGORY] == StageCategory.PRELIMINARY
        ]
        if games_with_result.empty:
            return qualify_round
        table = engine.rank_by_games(games_with_result)
        return table.sort_values(by=STANDING)

    def get_final_table(self):
        if not self.has_finalround():
            return None
        if self._gameinfo[self._gameinfo[STATUS] != FINISHED].empty is False:
             return pd.DataFrame()

        if self.league_season_ruleset is None:
            return None
        league_config_ruleset = LeagueConfigRuleset.from_ruleset(self.league_season_ruleset)
        engine = FinalRankingEngine(league_config_ruleset)
        return engine.compute_final_table(self._games_with_result)

    def _get_passcheck_player_jersey_number(self):
        key_mapping = {
            "gameday_id": "gameday_id",
            "gameday_jersey": "gameday_jersey",
            "playerlist__team_id": "team_id",
            "playerlist__player__person__first_name": "first_name",
            "playerlist__player__person__last_name": "last_name",
        }

        passcheck_players = (pd.DataFrame(
            PlayerlistGameday.objects
                .filter(gameday_id=self.gameday)
                .values(*key_mapping.keys())
        ))

        if passcheck_players.empty:
            return passcheck_players

        passcheck_players = passcheck_players.rename(columns=key_mapping).astype({
            "gameday_id": int,
            "gameday_jersey": int,
            "team_id": int,
            "first_name": str,
            "last_name": str,
        })
        return passcheck_players

    def get_offense_player_statistics_table(self):
        scoring_events = ["Touchdown", "1-Extra-Punkt", "2-Extra-Punkte"]

        output_columns = ["Platz", "Spieler"] + scoring_events + ["Punkte"]

        events = pd.DataFrame(
            TeamLog.objects.filter(
                gameinfo__in=self._gameinfo["id"],
                isDeleted=False,
                event__in=scoring_events,
            )
            .exclude(team=None)
            .exclude(player=None)
            .values(TEAM_DESCRIPTION, "team__name", TEAM_ID, "event", "player", "value")
        )

        if events.empty:
            return pd.DataFrame(columns=output_columns)

        config = dict()
        if safe_config := self.league_season_config:
            config = safe_config.get_gameday_statistic_settings()

        if config.get(SHOW_PLAYER_NAMES, False) and not (passcheck_player_names_df := self._get_passcheck_player_jersey_number()).empty:
            events["player"] = events.merge(
                passcheck_player_names_df,
                left_on=["player", TEAM_ID],
                right_on=["gameday_jersey", "team_id"],
                how="left",
            ).apply(lambda x: f"{x.team__name} #{x.player}" + (" Unbekannt" if pd.isna(x.first_name) else f" - {x.first_name} {x.last_name}"), axis=1)
        else:
            events["player"] = events.apply(lambda x: f"{x.team__description} #{x.player}", axis=1)

        table = (
            pd.crosstab(
                events["player"], events["event"], values=events.event, aggfunc="count"
            )
            .fillna(0)
            .astype(int)
        )

        for missing_event in set(scoring_events) - set(table.columns):
            table[missing_event] = 0

        points = events.groupby("player").value.sum()

        table = (
            table.merge(left_index=True, right=points, right_index=True)
            .reset_index()
            .sort_values(by="value", ascending=False)
        )

        table["Platz"] = table.value.rank(method="min", ascending=False).astype(int)

        table = table.rename(columns={"player": "Spieler", "value": "Punkte"})[
            output_columns
        ]

        return table[table.Platz <= config.get(TOP_N_PLAYER, 10)]

    def get_defense_statistic_table(self):
        events_by_type = self._get_all_defense_events()

        ints = (
            self._process_events_table(
                events_by_type.get("Interception", pd.DataFrame()),
                event_plural_name="Interceptions"
            )
            .reset_index(drop=True)
            .astype(str)
        )
        safeties = (
            self._process_events_table(
                events_by_type.get("Safety (+2)", pd.DataFrame()),
                event_plural_name="Safety (+2)",
            )
            .reset_index(drop=True)
            .astype(str)
        )

        result = (
            ints.merge(safeties, how="outer", left_index=True, right_index=True)
            .fillna("")
            .rename(
                columns={
                    "Platz_x": "Platz",
                    "Platz_y": "Platz",
                    "Spieler_x": "Spieler",
                    "Spieler_y": "Spieler",
                }
            )
        )

        return result

    def _get_all_defense_events(self):
        events = pd.DataFrame(
            TeamLog.objects.filter(
                gameinfo__in=self._gameinfo["id"],
                isDeleted=False,
                event__in=["Interception", "Safety (+2)"]
            )
            .exclude(team=None)
            .exclude(player=None)
            .values(TEAM_DESCRIPTION, TEAM_ID, "team__name", "event", "player")
        )

        if events.empty:
            return {"Interception": pd.DataFrame(), "Safety (+2)": pd.DataFrame()}

        config = dict()
        if safe_config := self.league_season_config:
            config = safe_config.get_gameday_statistic_settings()

        if config.get(SHOW_PLAYER_NAMES, False) and not (passcheck_player_names_df := self._get_passcheck_player_jersey_number()).empty:
            events["player"] = events.merge(
                passcheck_player_names_df,
                left_on=["player", TEAM_ID],
                right_on=["gameday_jersey", "team_id"],
                how="left",
            ).apply(lambda x: f"{x.team__name} #{x.player}" + (
                " Unbekannt" if pd.isna(x.first_name) else f" - {x.first_name} {x.last_name}"), axis=1)
        else:
            events["player"] = events.apply(lambda x: f"{x.team__description} #{x.player}", axis=1)

        return {event_type: group for event_type, group in events.groupby("event")}

    def _process_events_table(self, events: pd.DataFrame, event_plural_name: str):
        if events.empty:
            return pd.DataFrame(columns=["Platz", "Spieler", event_plural_name])

        events = (
            events.groupby("player", as_index=False)
            .event.count()
            .sort_values(by="event", ascending=False)
        )

        events["Platz"] = events.event.rank(method="min", ascending=False).astype(int)
        return (
            events[["Platz", "player", "event"]]
            .rename(columns={"player": "Spieler", "event": event_plural_name})
            .head()
        )

    def _get_player_events_table(self, event_name: str, event_plural_name: str):
        output_columns = ["Platz", "Spieler", event_plural_name]
        events = pd.DataFrame(
            TeamLog.objects.filter(
                gameinfo__in=self._gameinfo["id"], isDeleted=False, event=event_name
            )
            .exclude(team=None)
            .exclude(player=None)
            .values(TEAM_DESCRIPTION, TEAM_ID, "team__name", "event", "player")
        )

        if events.empty:
            return pd.DataFrame(columns=output_columns)

        config = dict()
        if safe_config := self.league_season_config:
            config = safe_config.get_gameday_statistic_settings()

        if config.get(SHOW_PLAYER_NAMES, False) and not (passcheck_player_names_df := self._get_passcheck_player_jersey_number()).empty:
            events["player"] = events.merge(
                passcheck_player_names_df,
                left_on=["player", TEAM_ID],
                right_on=["gameday_jersey", "team_id"],
                how="left",
            ).apply(lambda x: f"{x.team__name} #{x.player}" + (
                " Unbekannt" if pd.isna(x.first_name) else f" - {x.first_name} {x.last_name}"), axis=1)
        else:
            events["player"] = events.apply(lambda x: f"{x.team__description} #{x.player}", axis=1)

        events = (
            events.groupby("player", as_index=False)
            .event.count()
            .sort_values(by="event", ascending=False)
        )

        events["Platz"] = events.event.rank(method="min", ascending=False).astype(int)
        return (
            events[["Platz", "player", "event"]]
            .rename(columns={"player": "Spieler", "event": event_plural_name})
            .head()
        )

    def _get_standing_list(self, standings):
        final_standing = self._games_with_result.groupby(
            [STANDING, TEAM_DESCRIPTION], as_index=False
        )
        final_standing = final_standing.agg(
            {POINTS: "sum", PF: "sum", PA: "sum", DIFF: "sum"}
        )
        final_standing = final_standing.sort_values(
            by=[STANDING, POINTS, DIFF, PF, PA], ascending=False
        )
        # final_standing = final_standing.sort_values(by=STANDING)
        final_team_list = []
        for current_standing in standings:
            current_standing_table = final_standing[
                final_standing[STANDING] == current_standing
            ]
            if current_standing_table.shape[0] == 2:
                final_team_list = (
                    final_team_list + current_standing_table[TEAM_DESCRIPTION].to_list()
                )
            else:
                current_standing_table = current_standing_table.groupby(
                    [TEAM_DESCRIPTION], as_index=False
                )
                current_standing_table = current_standing_table.agg(
                    {POINTS: "sum", PF: "sum", PA: "sum", DIFF: "sum"}
                )
                current_standing_table = current_standing_table.sort_values(
                    by=[POINTS, DIFF, PF, PA], ascending=False
                )
                final_team_list = (
                    final_team_list + current_standing_table[TEAM_DESCRIPTION].to_list()
                )

        return final_team_list

    def _get_schedule(self):
        home_teams = self._games_with_result.groupby(GAMEINFO_ID).nth(0).reset_index()
        away_teams = self._games_with_result.groupby(GAMEINFO_ID).nth(1).reset_index()
        home_teams = home_teams.rename(
            columns={TEAM_DESCRIPTION: HOME, PF: POINTS_HOME, ID_Y: ID_HOME}
        )
        away_teams = away_teams.rename(
            columns={TEAM_DESCRIPTION: AWAY, PF: POINTS_AWAY, ID_Y: ID_AWAY}
        )
        away_teams = away_teams[[ID_AWAY, POINTS_AWAY, AWAY]]
        qualify_round = pd.concat([home_teams, away_teams], axis=1).sort_values(
            by=[FIELD, SCHEDULED]
        )
        qualify_round = qualify_round[
            [GAMEINFO_ID, ID_HOME, HOME, POINTS_HOME, POINTS_AWAY, AWAY, ID_AWAY]
        ]

        schedule = self._gameinfo.merge(
            qualify_round, how="left", right_on=GAMEINFO_ID, left_on="id"
        )
        schedule = schedule.fillna({ID_HOME: "", ID_AWAY: ""}).astype(
            {ID_HOME: "string", ID_AWAY: "string"}
        )
        return schedule

    def _get_table(self):
        qualify_round = self._games_with_result[
            self._games_with_result[STAGE_CATEGORY] == StageCategory.PRELIMINARY
        ]
        qualify_round = qualify_round.groupby([STANDING, TEAM_DESCRIPTION], as_index=False)
        # Named aggregation: rename the summed "points" column to "win_points"
        # in the output. The source DataFrame only has a "points" column
        # (built in __init__), so the old-style dict form {WIN_POINTS: 'sum'}
        # would raise a KeyError here since "win_points" isn't a source
        # column — pandas' dict-style agg requires keys to already exist in
        # the frame being aggregated. Named aggregation lets us rename on the
        # way out instead.
        qualify_round = qualify_round.agg(
            **{
                WIN_POINTS: (POINTS, 'sum'),
                PF: (PF, 'sum'),
                PA: (PA, 'sum'),
                DIFF: (DIFF, 'sum'),
                TEAM_ID: (TEAM_ID, 'first'),
            }
        )
        qualify_round = qualify_round.sort_values(by=[WIN_POINTS, DIFF, PF, PA], ascending=False)
        qualify_round = qualify_round.sort_values(by=STANDING)
        return qualify_round

    def get_qualify_team_by(self, place, standing):
        qualify_round = self._get_table()
        nth_standing = qualify_round.groupby(STANDING).nth(place - 1)
        return nth_standing[nth_standing[STANDING] == standing][TEAM_DESCRIPTION].iloc[0]

    def get_team_by_points(self, place, standing, points):
        teams = self._get_teams_by(standing, points)
        return teams.iloc[place - 1][TEAM_DESCRIPTION]

    def get_team_by(self, place, standing, points=None):
        if points is None:
            return self.get_qualify_team_by(place, standing)
        return self.get_team_by_points(place, standing, points)

    def _has_standing(self, check):
        return self._gameinfo[self._gameinfo[STAGE].isin([check])].empty

    def is_finished(self, check):
        if self._has_standing(check):
            return len(
                self._gameinfo[
                    (self._gameinfo[STANDING] == check)
                    & (self._gameinfo[STATUS] == FINISHED)
                ]
            ) == len(self._gameinfo[(self._gameinfo[STANDING] == check)])

        return len(
            self._gameinfo[
                (self._gameinfo[STAGE] == check) & (self._gameinfo[STATUS] == FINISHED)
            ]
        ) == len(self._gameinfo[(self._gameinfo[STAGE] == check)])

    def get_games_to_whistle(self, team):
        games_to_whistle = self._get_schedule()
        games_to_whistle = games_to_whistle.sort_values(by=[SCHEDULED, FIELD])
        if not team:
            return games_to_whistle[games_to_whistle[GAME_FINISHED].isna()]
        return games_to_whistle[
            (games_to_whistle[OFFICIALS_NAME].str.contains(team))
            & (games_to_whistle[GAME_FINISHED].isna())
        ]

    def get_team_by_qualify_for(self, place, index):
        qualify_standing_by_place = (
            self._get_table()
            .groupby(STANDING)
            .nth(place - 1)
            .sort_values(by=[WIN_POINTS, DIFF, PF, PA], ascending=False)
        )
        return qualify_standing_by_place.iloc[index][TEAM_DESCRIPTION]

    def get_team_aggregate_by(self, aggregate_standings, aggregate_place, place):
        return (
            self._games_with_result[
                self._games_with_result[STANDING].isin(aggregate_standings)
            ]
            .groupby([STANDING, TEAM_DESCRIPTION], as_index=False)
            .agg({POINTS: "sum", PF: "sum", PA: "sum", DIFF: "sum"})
            .sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
            .sort_values(by=STANDING)
            .groupby(STANDING)
            .nth(aggregate_place - 1)
            .sort_values(by=[POINTS, DIFF, PF, PA], ascending=False)
            .iloc[place - 1][TEAM_DESCRIPTION]
        )

    def get_teams_by(self, standing, points):
        teams = self._get_teams_by(standing, points)
        return list(teams[TEAM_DESCRIPTION])

    def _get_teams_by(self, standing, points):
        results_with_standing = self._games_with_result[
            self._games_with_result[STANDING] == standing
        ]
        results_with_standing_and_according_points = results_with_standing[
            results_with_standing[POINTS] == points
        ]
        return results_with_standing_and_according_points
