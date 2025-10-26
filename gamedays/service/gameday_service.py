import pandas as pd

from gamedays.models import Gameinfo, TeamLog, Gameresult
from gamedays.service.gameday_settings import ID_AWAY, SCHEDULED, FIELD, OFFICIALS_NAME, STAGE, STANDING, HOME, \
    POINTS_HOME, \
    POINTS_AWAY, AWAY, STATUS, ID_HOME, OFFICIALS, TEAM_NAME, POINTS, PF, PA, DIFF, DFFL
from gamedays.service.gamelog import GameLog
from gamedays.service.model_wrapper import GamedayModelWrapper

EMPTY_DATA = '[]'

TABLE_HEADERS = {
    DFFL: 'DFFL-Punkte',
    STANDING: 'Gruppe',
    TEAM_NAME: 'Team',
    POINTS: 'Punkte',
    PF: 'PF',
    PA: 'PA',
    DIFF: '+/-'
}

SCHEDULE_TABLE_HEADERS = {
    SCHEDULED: 'Start',
    FIELD: 'Feld',
    HOME: 'Heim',
    POINTS_HOME: 'Pkt',
    POINTS_AWAY: 'Pkt',
    AWAY: 'Gast',
    OFFICIALS_NAME: 'Officials',
    STANDING: 'Platz',
    STAGE: 'Runde',
    STATUS: 'Status'
}


class EmptySchedule:
    @staticmethod
    def to_html(*args, **kwargs):
        return 'Spielplan wurde noch nicht erstellt'

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyQualifyTable:
    @staticmethod
    def to_html(*args, **kwargs):
        return ''

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyFinalTable:
    @staticmethod
    def to_html(*args, **kwargs):
        return 'Abschlusstabelle wird berechnet, sobald alle Spiele beendet sind.'

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


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


class GamedayService:
    @classmethod
    def create(cls, gameday_pk):
        try:
            return cls(gameday_pk)
        except Gameinfo.DoesNotExist:
            return EmptyGamedayService

    def __init__(self, pk):
        self.gmw = GamedayModelWrapper(pk)

    def get_schedule(self):
        schedule = self.gmw.get_schedule()
        columns = [SCHEDULED, FIELD, HOME, POINTS_HOME, POINTS_AWAY, AWAY, OFFICIALS_NAME, STANDING, STAGE, STATUS]
        schedule = schedule[columns]
        schedule[OFFICIALS_NAME] = schedule[OFFICIALS_NAME].apply('<i>{}</i>'.format)
        schedule[SCHEDULED] = pd.to_datetime(schedule[SCHEDULED], format='%H:%M:%S').dt.strftime('%H:%M')

        schedule = schedule.rename(columns=SCHEDULE_TABLE_HEADERS)
        return schedule

    def get_qualify_table(self):
        qualify_table = self.gmw.get_qualify_table()
        if qualify_table is '':
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
        if team == '*':
            team = ''
        games_to_whistle = self.gmw.get_games_to_whistle(team)
        columns = [SCHEDULED, FIELD, OFFICIALS, OFFICIALS_NAME, STAGE, STANDING, HOME, POINTS_HOME, POINTS_AWAY, AWAY,
                   STATUS, ID_HOME, ID_AWAY, 'id']
        games_to_whistle = games_to_whistle[columns]
        games_to_whistle = games_to_whistle.rename(columns={OFFICIALS: 'officialsId', OFFICIALS_NAME: OFFICIALS})
        return games_to_whistle

    def get_offense_player_statistics_table(self):
        return self.gmw.get_offense_player_statistics_table()

    def get_defense_player_statistic_table(self):
        return self.gmw.get_defense_statistic_table()


class EmptyGamedayGameService:
    pass

class GamedayGameService:
    @classmethod
    def create(cls, game_pk):
        try:
            return cls(game_pk)
        except Gameinfo.DoesNotExist:
            return EmptyGamedayGameService

    def __init__(self, pk):
        self.game = Gameinfo.objects.get(pk=pk)
        self.gameresult = pd.DataFrame(Gameresult.objects \
                                  .filter(gameinfo=pk) \
                                  .order_by("isHome") \
                                  .values("team__description", "team", "isHome"))

        self.home_team_name = self.gameresult.iloc[1]['team__description']
        self.home_team_id = self.gameresult.iloc[1]['team']
        self.away_team_name = self.gameresult.iloc[0]['team__description']
        self.away_team_id = self.gameresult.iloc[0]['team']

        self._column_mapping = {
            # "created_time": "Zeit",
            self.home_team_name: self.home_team_name,
            "input": "Spielstand",
            self.away_team_name: self.away_team_name,
        }
        self.output_columns = self._column_mapping.values()

    def _prepare_team_logs(self):
        events = pd.DataFrame(TeamLog.objects \
            .filter(gameinfo=self.game.pk) \
            .exclude(isDeleted=True) \
            .order_by("created_time") \
            .values(*[x.name for x in TeamLog._meta.local_fields], "team__description")
        )

        events.player = events.player.apply(lambda x: '' if pd.isna(x) else f"#{str(int(x))}")
        events.input = events["input"].apply(lambda x: '' if pd.isna(x) else f": {x}")
        events["is_scoring_play"] = events.value > 0
        events["event_with_player"] = events.apply(lambda x: x.player + ' ' + x.event + x.input, axis=1)
        return events

    def get_events_table(self):
        events = self._prepare_team_logs()

        static_events = events[pd.isna(events.team)].copy()
        team_events = events[~pd.isna(events.team)].copy()

        event_ct = pd.crosstab(
            index=team_events.id,
            columns=team_events.team__description,
            values=team_events.event_with_player,
            aggfunc='first'
        ).fillna('')

        event_ct = event_ct.merge(
            right=team_events[["id", "created_time", "player"]],
            left_index=True,
            right_on='id'
        )

        scores_ct = pd.crosstab(team_events.id, team_events.team__description, values=team_events.value, aggfunc='sum')
        scores_ct = scores_ct.fillna(0).astype(int).cumsum().ffill()
        scores_ct["score"] = scores_ct.apply(lambda x: f"{x[self.home_team_name]}:{x[self.away_team_name]}", axis=1)
        scores_ct["previous_score"] = scores_ct.score != scores_ct.score.shift(1)
        scores_ct.score = scores_ct.apply(lambda x: x.score if x.previous_score else '', axis=1)

        event_ct = event_ct.merge(
            right=scores_ct[["score"]],
            left_on='id',
            right_index=True,
            suffixes=('', '')
        )

        event_ct = pd.concat(
            objs=[
                event_ct,
                static_events[["id", "created_time", "event"]].rename(columns={'event': 'input'})
            ]
        ).fillna('').sort_values("id")

        event_ct.input = event_ct.apply(lambda x: x.input if len(x.input) > 0 else x.score, axis=1)
        event_ct.created_time = event_ct.created_time.apply(lambda x: x.strftime("%H:%M"))

        return event_ct.rename(columns=self._column_mapping)[self.output_columns]
