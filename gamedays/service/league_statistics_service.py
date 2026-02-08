from socket import send_fds

import pandas as pd

from gamedays.service.model_statistics_wrapper import LeagueStatisticsModelWrapper


class EmptyStatisticsTable:

    @staticmethod
    def to_html(*args, **kwargs):
            return "Die Statistiken erscheinen nach den ersten Spielen."

    @staticmethod
    def to_json(*args, **kwargs):
            return "[]"


class EmptyLeagueStatisticsService:
    @staticmethod
    def get_touchdowns_table():
        return EmptyStatisticsTable

    @staticmethod
    def get_interception_table():
        return EmptyStatisticsTable

    @staticmethod
    def get_one_extra_point_table():
        return EmptyStatisticsTable

    @staticmethod
    def get_two_extra_point_table():
        return EmptyStatisticsTable

    @staticmethod
    def get_safety_table():
        return EmptyStatisticsTable

    @staticmethod
    def get_top_scoring_players():
        return EmptyStatisticsTable

    @staticmethod
    def get_team_event_summary_table():
        return EmptyStatisticsTable


class LeagueStatisticsService:
    @classmethod
    def create(cls, season, league, top_n_players):
        try:
            return cls(season, league, top_n_players)
        except ValueError:
            return EmptyLeagueStatisticsService

    def __init__(self, season, league, top_n_players):
        self.lsmw = LeagueStatisticsModelWrapper(season, league)
        self.season = season
        self.league = league
        self.top_n_players = top_n_players

    def get_touchdowns_table(self):
        return self.lsmw.get_top_touchdown_players(top=self.top_n_players)

    def get_interception_table(self):
        return self.lsmw.get_top_interception_players(top=self.top_n_players)

    def get_one_extra_point_table(self):
        return self.lsmw.get_top_one_extra_point_players(top=self.top_n_players)

    def get_two_extra_point_table(self):
        return self.lsmw.get_top_two_extra_point_players(top=self.top_n_players)

    def get_safety_table(self):
        return self.lsmw.get_top_safety_players(top=self.top_n_players)

    def get_top_scoring_players(self):
        return self.lsmw.get_top_scoring_players(top=self.top_n_players)

    def get_team_event_summary_table(self):
        return self.lsmw.get_team_event_summary()