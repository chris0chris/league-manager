from abc import ABC, abstractmethod

import pandas as pd

from gamedays.forms import SCHEDULE_CUSTOM_CHOICE_C, GamedayGaminfoFieldsAndGroupsForm
from gamedays.models import Gameinfo
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
    PF,
    PA,
    DIFF,
    DFFL,
    WIN_POINTS,
)
from gamedays.service.model_wrapper import GamedayModelWrapper

EMPTY_DATA = '[]'

TABLE_HEADERS = {
    DFFL: 'DFFL-Punkte',
    STANDING: 'Gruppe',
    TEAM_NAME: 'Team',
    WIN_POINTS: 'Punkte',
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


class HtmlAndJsonRendering(ABC):
    @abstractmethod
    def to_html(self, *args, **kwargs):
        raise NotImplementedError

    @abstractmethod
    def to_json(self, *args, **kwargs):
        raise NotImplementedError


class EmptySchedule(HtmlAndJsonRendering):
    def to_html(self, *args, **kwargs):
        return None

    def to_json(self, *args, **kwargs):
        return EMPTY_DATA


class EmptyQualifyTable(HtmlAndJsonRendering):
    def to_html(self, *args, **kwargs):
        return None

    def to_json(self, *args, **kwargs):
        return EMPTY_DATA


class EmptyFinalTable(HtmlAndJsonRendering):
    def to_html(self, *args, **kwargs):
        return 'Abschlusstabelle wird berechnet, sobald alle Spiele beendet sind.'

    def to_json(self, *args, **kwargs):
        return EMPTY_DATA


class EmptyFinalTableMainRound(HtmlAndJsonRendering):
    def to_html(self, *args, **kwargs):
        return 'Abschlusstabelle wird nicht berechnet, da es keine Playoffs gibt.'

    def to_json(self, *args, **kwargs):
        return EMPTY_DATA


class EmptyOffenseStatisticTable(HtmlAndJsonRendering):
    def to_html(self, *args, **kwargs):
        return 'Offense Statistiken sind nach dem 1. Spiel verfügbar.'

    def to_json(self, *args, **kwargs):
        return EMPTY_DATA


class EmptyDefenseStatisticTable(HtmlAndJsonRendering):
    def to_html(self, *args, **kwargs):
        return 'Defense Statistiken sind nach dem 1. Spiel verfügbar.'

    def to_json(self, *args, **kwargs):
        return EMPTY_DATA


class EmptyGamedayService:
    def get_schedule(self, *args, **kwargs):
        return EmptySchedule()

    def get_games_to_whistle(self, *args, **kwargs):
        return EmptySchedule()

    def get_qualify_table(self):
        return EmptyQualifyTable()

    def get_final_table(self):
        return EmptyFinalTable()

    def get_offense_player_statistics_table(self):
        return EmptyOffenseStatisticTable()

    def get_defense_player_statistic_table(self):
        return EmptyDefenseStatisticTable()


class GamedayService:
    @classmethod
    def create(cls, gameday_pk):
        try:
            return cls(gameday_pk)
        except Gameinfo.DoesNotExist:
            return EmptyGamedayService()

    def __init__(self, pk):
        self.gmw = GamedayModelWrapper(pk)

    def get_schedule(self):
        schedule = self.gmw.get_schedule()
        # TODO remove id
        columns = ['id', SCHEDULED, FIELD, HOME, POINTS_HOME, POINTS_AWAY, AWAY, OFFICIALS_NAME, STANDING, STAGE, STATUS]
        schedule = schedule[columns]
        schedule[OFFICIALS_NAME] = schedule[OFFICIALS_NAME].apply('<i>{}</i>'.format)
        schedule[SCHEDULED] = pd.to_datetime(schedule[SCHEDULED], format='%H:%M:%S').dt.strftime('%H:%M')

        schedule = schedule.rename(columns=SCHEDULE_TABLE_HEADERS)
        return schedule

    def get_qualify_table(self):
        qualify_table = self.gmw.get_qualify_table()
        if qualify_table is '':
            return EmptyQualifyTable()
        return qualify_table

    def get_final_table(self):
        final_table = self.gmw.get_final_table()
        if final_table is None:
            return EmptyFinalTableMainRound()
        elif final_table.empty:
            return EmptyFinalTable()
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

    @staticmethod
    def update_format(gameday, data):
        if data.get(GamedayGaminfoFieldsAndGroupsForm.FORMAT_C) == SCHEDULE_CUSTOM_CHOICE_C:
            gameday.format = f"{gameday.league.name}_Gruppen{data[GamedayGaminfoFieldsAndGroupsForm.NUMBER_GROUPS_C]}_Felder{data[GamedayGaminfoFieldsAndGroupsForm.NUMBER_FIELDS_C]}"
        else:
            gameday.format = data.get(GamedayGaminfoFieldsAndGroupsForm.FORMAT_C)
        gameday.save()
