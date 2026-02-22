import pandas as pd

from gamedays.models import Gameday, Gameinfo, TeamLog

INDIVIDUAL_STATISTIC_EVENTS = [
    "Touchdown",
    "Interception",
    "1-Extra-Punkt",
    "2-Extra-Punkte",
    "Safety (+2)",
    "Safety (+1)"
]

TEAM_LOG_COLUMNS = [
    "id",
    "team__name",
    "team__description",
    "player",
    "event",
    "value"
]

class LeagueStatisticsModelWrapper:

    def __init__(self, season, league):
        self.season = season
        self.league = league
        self.gameday_ids = []
        self.gameinfo_ids = []
        self.team_logs = pd.DataFrame([])
        self.player_aggregation = pd.DataFrame([])
        self.team_aggregation = pd.DataFrame([])

        self.scoring_column_values = {
            "Touchdown": 6,
            "1-Extra-Punkt": 1,
            "2-Extra-Punkte": 2,
            "Safety (+1)": 1,
            "Safety (+2)": 2,
        }

        self._get_gameday_ids()
        self._aggregate_team_logs()
        self._aggregate_player_events()
        self._aggregate_team_events()

    def _get_gameday_ids(self):
        """
        Aggregate all gameinfo_ids for the current League Statistics Model Wrapper
        """
        self.gameday_ids = list(map(lambda x: x[0],
                                    Gameday.objects.filter(
                                        season__name=self.season,
                                        league__name=self.league,
                                    )
                                    .exclude(name__icontains="Relegation")
                                    .exclude(name__icontains="Final")
                                    .values_list("id")))

        # TODO: Filter out gameday containing 'Relegation' or 'Final'

        self.gameinfo_ids = list(map(lambda x: x[0],
                                     Gameinfo.objects.filter(
                                         gameday_id__in=self.gameday_ids
                                     ).values_list("id")))

    def _aggregate_team_logs(self):
        self.team_logs = pd.DataFrame(
            TeamLog.objects
                .filter(gameinfo__in=self.gameinfo_ids, event__in=INDIVIDUAL_STATISTIC_EVENTS)
                .exclude(isDeleted=True)
                .exclude(event__in=["1-Extra-Punkt", "2-Extra-Punkte"], value=0)
                .exclude(player__isnull=True)
                .values(*TEAM_LOG_COLUMNS)
        )

        if len(self.team_logs) == 0:
            raise ValueError("There are no team logs in this league.")

        self.team_logs["team_player"] = self.team_logs.apply(lambda x: f"{x['team__name']} #{x['player']}", axis=1)


    def _aggregate_player_events(self):
        self.player_aggregation = pd.crosstab(
            index=self.team_logs.team_player,
            columns=self.team_logs.event,
            values=self.team_logs.id,
            aggfunc='count'
        ).fillna(0).astype(int)

        missing_columns = set(INDIVIDUAL_STATISTIC_EVENTS) - set(self.player_aggregation.columns)
        for missing_column in missing_columns:
            self.player_aggregation[missing_column] = 0


    def _aggregate_team_events(self):
        self.team_aggregation = pd.crosstab(
            index=self.team_logs.team__name,
            columns=self.team_logs.event,
            values=self.team_logs.id,
            aggfunc='count'
        ).fillna(0).astype(int)

        missing_columns = set(TEAM_LOG_COLUMNS) - set(self.team_aggregation.columns)
        for missing_column in missing_columns:
            self.team_aggregation[missing_column] = 0

    def _get_top_event_players(self, event: str, top: int) -> pd.DataFrame:
        relevant_column = self.player_aggregation[[event]].sort_values(event, ascending=False).head(top).copy()
        relevant_column["rank"] = relevant_column[event].rank(method='min', ascending=False).astype(int)
        # scoring_player_aggregation["rank"] <= top

        relevant_column = relevant_column.rename_axis(None, axis=1).reset_index()[["rank", "team_player", event]]

        return relevant_column[(relevant_column["rank"] <= top) & (relevant_column[event] > 0)].rename(columns={
            "rank": "Liga Platzierung",
            "team_player": "Spieler",
            event: f"Anzahl {event}"
        })

    def get_top_scoring_players(self, top: int) -> pd.DataFrame:

        def _sum_scoring_values(series) -> int:
            return sum([num * self.scoring_column_values.get(event, 0) for event, num in (zip(series.index, series))])

        scoring_player_aggregation = self.player_aggregation

        missing_columns = list(set(self.scoring_column_values.keys()) - set(scoring_player_aggregation.columns))
        for column in missing_columns:
            scoring_player_aggregation[column] = 0

        scoring_player_aggregation["total_points"] = scoring_player_aggregation.apply(_sum_scoring_values, axis=1)
        scoring_player_aggregation.sort_values(by="total_points", ascending=False, inplace=True)

        scoring_player_aggregation = scoring_player_aggregation.rename_axis(None, axis=1).reset_index()[
            ["team_player"] + list(self.scoring_column_values.keys()) + ["total_points"]
        ]

        scoring_player_aggregation["rank"] = scoring_player_aggregation["total_points"] \
            .rank(method='min', ascending=False) \
            .astype(int)


        return scoring_player_aggregation[scoring_player_aggregation["rank"] <= top].rename(columns={
            "total_points": "Punkte",
            "rank": "Liga Platzierung",
            "team_player": "Spieler",
            "1-Extra-Punkt": "1-XP",
            "2-Extra-Punkte": "2-XP",
        })[[
            "Liga Platzierung",
            "Spieler",
            "Punkte",
            "Touchdown",
            "1-XP",
            "2-XP",
            "Safety (+1)",
            "Safety (+2)"
        ]]

    def get_top_touchdown_players(self, top=10) -> pd.DataFrame:
        return self._get_top_event_players("Touchdown", top)

    def get_top_one_extra_point_players(self, top=10) -> pd.DataFrame:
        return self._get_top_event_players("1-Extra-Punkt", top)

    def get_top_two_extra_point_players(self, top=10) -> pd.DataFrame:
        return self._get_top_event_players("2-Extra-Punkte", top)

    def get_top_interception_players(self, top=10) -> pd.DataFrame:
        return self._get_top_event_players("Interception", top)

    def get_top_safety_players(self, top=10) -> pd.DataFrame:
        return self._get_top_event_players("Safety (+2)", top)

    def get_team_event_summary(self) -> pd.DataFrame:

        def _sum_scoring_values(series) -> int:
            return sum([num * self.scoring_column_values.get(event, 0) for event, num in (zip(series.index, series))])

        team_event_aggregation = self.team_aggregation

        missing_columns = list(set(INDIVIDUAL_STATISTIC_EVENTS) - set(team_event_aggregation.columns))
        for column in missing_columns:
            team_event_aggregation[column] = 0

        team_event_aggregation["total_points"] = team_event_aggregation.apply(_sum_scoring_values, axis=1)
        team_event_aggregation.sort_values(by="total_points", ascending=False, inplace=True)

        team_event_aggregation = team_event_aggregation.rename_axis(None, axis=1)

        team_event_aggregation = team_event_aggregation[
            ["team__name"] + INDIVIDUAL_STATISTIC_EVENTS + ["total_points"]
        ]

        return team_event_aggregation.rename(columns={
            "team__name": "Team",
            "total_points": "Summe Punkte",
            "1-Extra-Punkt": "1-XP",
            "2-Extra-Punkte": "2-XP",
        })
