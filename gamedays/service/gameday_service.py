import pandas as pd
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import QuerySet

from gamedays.models import Gameinfo, Team
from gamedays.service.gameday_settings import ID_AWAY, SCHEDULED, FIELD, OFFICIALS_NAME, STAGE, STANDING, HOME, \
    POINTS_HOME, \
    POINTS_AWAY, AWAY, STATUS, ID_HOME, OFFICIALS, TEAM_NAME, POINTS, PF, PA, DIFF, DFFL
from gamedays.service.model_helper import GameresultHelper
from gamedays.service.model_wrapper import GamedayModelWrapper
from league_manager.utils.view_utils import UserRequestPermission

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


class GamedayServiceDeprecated:
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


class GamedayService:
    def __init__(self, user_permission=UserRequestPermission()):
        self.user_permission = user_permission

    def get_officiating_gameinfo(self, officiating_team: Team | None, gameday, all_games_wanted=False) -> QuerySet[
        Gameinfo]:
        if officiating_team is None and self.user_permission.is_staff:
            gameinfo = Gameinfo.objects.filter(gameday__in=gameday)
        elif all_games_wanted:
            gameinfo = Gameinfo.objects.filter(gameday__in=gameday)
            if not gameinfo.filter(officials=officiating_team).exists():
                raise ObjectDoesNotExist()
        else:
            gameinfo = Gameinfo.objects.filter(officials_id=officiating_team, gameday__in=gameday)
            if not gameinfo.exists():
                raise ObjectDoesNotExist()
        gameinfo = gameinfo.annotate(
            home_id=GameresultHelper.get_gameresult_team_subquery(is_home=True, team_column='id'),
            home=GameresultHelper.get_gameresult_team_subquery(is_home=True, team_column='description'),
            away_id=GameresultHelper.get_gameresult_team_subquery(is_home=False, team_column='id'),
            away=GameresultHelper.get_gameresult_team_subquery(is_home=False, team_column='description'),
        ).order_by('scheduled', 'field')
        return gameinfo
