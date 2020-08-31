from gamedays.models import Gameinfo
from gamedays.service.model_wrapper import GamedayModelWrapper


class EmptySchedule:
    @staticmethod
    def to_html():
        return 'Spielplan wurde noch nicht erstellt'


class EmptyQualifyTable:
    @staticmethod
    def to_html():
        return ''


class EmptyFinalTable:
    @staticmethod
    def to_html():
        return 'Abschlusstabelle wird berechnet, sobald alle Spiele beendet sind.'


class EmptyGamedayService:

    @staticmethod
    def get_schedule():
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

    def get_schedule(self):
        return self.gmw.get_schedule()

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
    def create(cls, empty_gameday_pk):
        try:
            return cls(empty_gameday_pk)
        except Gameinfo.DoesNotExist:
            return EmptyGamedayService
