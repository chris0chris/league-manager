from gamedays.models import Gameinfo
from gamedays.service.gameday_settings import STANDING, POINTS_HOME, POINTS_AWAY, SCHEDULED, FIELD, OFFICIALS, STAGE, \
    HOME, AWAY, STATUS
from gamedays.service.model_wrapper import GamedayModelWrapper

EMPTY_DATA = '{"data": []}'

SCHEDULE_TABLE_HEADERS = {
    SCHEDULED: 'Kick-Off',
    FIELD: 'Feld',
    OFFICIALS: 'Officials',
    STAGE: 'Runde',
    STANDING: 'Platz',
    HOME: 'Heim',
    POINTS_HOME: 'Punkte Heim',
    POINTS_AWAY: 'Punkte Gast',
    AWAY: 'Gast',
    STATUS: 'Status'
}


class EmptySchedule:
    @staticmethod
    def to_html():
        return 'Spielplan wurde noch nicht erstellt'

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyQualifyTable:
    @staticmethod
    def to_html():
        return ''

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyFinalTable:
    @staticmethod
    def to_html():
        return 'Abschlusstabelle wird berechnet, sobald alle Spiele beendet sind.'

    @staticmethod
    def to_json(*args, **kwargs):
        return EMPTY_DATA


class EmptyGamedayService:

    @staticmethod
    def get_schedule(*args, **kwargs):
        return EmptySchedule

    @staticmethod
    def get_qualify_table():
        return EmptyQualifyTable

    @staticmethod
    def get_final_table():
        return EmptyFinalTable


class GamedayService:

    def __init__(self, pk):
        self.gmw = GamedayModelWrapper(pk)

    def get_schedule(self, api=False):
        schedule = self.gmw.get_schedule()
        if api:
            return schedule
        schedule = schedule[
            [SCHEDULED, FIELD, OFFICIALS, STAGE, STANDING, HOME, POINTS_HOME, POINTS_AWAY, AWAY, STATUS]]
        schedule = schedule.rename(columns=SCHEDULE_TABLE_HEADERS)
        return schedule

    def get_qualify_table(self):
        qualify_table = self.gmw.get_qualify_table()
        if qualify_table is '':
            return EmptyQualifyTable
        return qualify_table

    def get_final_table(self):
        final_table = self.gmw.get_final_table()
        if final_table is '':
            return EmptyFinalTable
        return final_table

    @classmethod
    def create(cls, gameday_pk):
        try:
            return cls(gameday_pk)
        except Gameinfo.DoesNotExist:
            return EmptyGamedayService
