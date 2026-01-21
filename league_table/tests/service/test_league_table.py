import pathlib

import pandas as pd
from django.test import TestCase

from gamedays.models import Season, League, Team, SeasonLeagueTeam
from gamedays.tests.setup_factories.db_setup import DBSetup
from league_table.service.league_table import LeagueTable


# ToDo extract method for reuseability
def get_df_from_json(filename):
    return pd.read_json(
        pathlib.Path(__file__).parent / "testdata/{0}".format(filename), orient="table"
    )


class TestLeagueTable(TestCase):

    def test_empty_league_table(self):
        DBSetup().create_empty_gameday()
        league_table = LeagueTable()
        assert league_table.get_standing(Season.objects.first()).empty

    def test_league_table(self):
        DBSetup().g72_finished()
        DBSetup().g62_finished()
        expected_overall_table = get_df_from_json("league_table_overall.json")
        league_table = LeagueTable()
        assert (
            league_table.get_standing(Season.objects.first()).to_json()
            == expected_overall_table.to_json()
        )

    def test_league_table_multiple_season(self):
        test_season = Season.objects.create(name="test season")
        another_season = Season.objects.create(name="another season")
        any_season = Season.objects.create(name="any season")
        DBSetup().g62_finished(season=test_season)
        DBSetup().g72_finished(season=another_season)
        DBSetup().g62_finished(season=any_season)
        DBSetup().g72_finished(season=any_season)
        expected_overall_table = get_df_from_json("league_table_overall.json")
        league_table = LeagueTable()
        assert (
            league_table.get_standing(any_season).to_json()
            == expected_overall_table.to_json()
        )

    def test_league_table_by_division_current_year_implicit(self):
        DBSetup().g72_finished()
        DBSetup().g62_finished()
        season = Season.objects.first()
        west = League.objects.create(name="west")
        south = League.objects.create(name="south")
        teams_A = Team.objects.filter(name__startswith="A")
        teams_B = Team.objects.filter(name__startswith="B")
        for team in teams_A:
            SeasonLeagueTeam.objects.create(season=season, league=south, team=team)
        for team in teams_B:
            SeasonLeagueTeam.objects.create(season=season, league=west, team=team)
        expected_overall_table = get_df_from_json("league_table_division_south.json")
        league_table = LeagueTable()
        assert (
            league_table.get_standing(season=season, league="south").to_json()
            == expected_overall_table.to_json()
        )

    def test_league_table_by_division_for_multiple_seasons(self):
        test_season = Season.objects.create(name="test season")
        another_season = Season.objects.create(name="another season")
        any_season = Season.objects.create(name="any season")
        all_seasons = [test_season, another_season, any_season]
        DBSetup().g62_finished(season=test_season)
        DBSetup().g72_finished(season=another_season)
        DBSetup().g62_finished(season=any_season)
        DBSetup().g72_finished(season=any_season)
        west = League.objects.create(name="west")
        south = League.objects.create(name="south")
        teams_A = Team.objects.filter(name__startswith="A")
        teams_B = Team.objects.filter(name__startswith="B")
        for season in all_seasons:
            for team in teams_A:
                SeasonLeagueTeam.objects.create(season=season, league=south, team=team)
            for team in teams_B:
                SeasonLeagueTeam.objects.create(season=season, league=west, team=team)
        expected_overall_table = get_df_from_json("league_table_division_south.json")
        league_table = LeagueTable()
        assert (
            league_table.get_standing(league="south", season=any_season).to_json()
            == expected_overall_table.to_json()
        )

    def test_league_table_by_illegal_league_name(self):
        DBSetup().g72_finished()
        DBSetup().g62_finished()
        league_table = LeagueTable()
        assert league_table.get_standing(
            season=Season.objects.first(), league="non existent league"
        ).empty
