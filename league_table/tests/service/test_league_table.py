import datetime
import pathlib

import pandas as pd
from django.test import TestCase

from gamedays.tests.setup_factories.db_setup import DBSetup
from league_table.service.league_table import LeagueTable
from teammanager.models import Team, League, SeasonLeagueTeam, Season


# ToDo extract method for reuseability
def get_df_from_json(filename):
    return pd.read_json(pathlib.Path(__file__).parent / 'testdata/{0}'.format(filename),
                        orient='table')


class TestLeagueTable(TestCase):

    def test_empty_league_table(self):
        DBSetup().create_empty_gameday()
        league_table = LeagueTable()
        assert league_table.get_standing().empty

    def test_league_table(self):
        today = datetime.date.today()
        DBSetup().g72_finished(date=today)
        DBSetup().g62_finished(date=today)
        expected_overall_table = get_df_from_json('league_table_overall.json')
        league_table = LeagueTable()
        assert league_table.get_standing().to_json() == expected_overall_table.to_json()

    def test_league_table_concrete_year(self):
        year = 2019
        DBSetup().g62_finished(date=f'{year}-10-10')
        DBSetup().g72_finished(date=f'{year}-01-23')
        expected_overall_table = get_df_from_json('league_table_overall.json')
        league_table = LeagueTable()
        assert league_table.get_standing(year).to_json() == expected_overall_table.to_json()

    def test_league_table_multiple_season(self):
        year = datetime.date.today().year
        DBSetup().g62_finished(date=f'{year + 1}-10-10')
        DBSetup().g72_finished(date=f'{year - 2}-01-23')
        DBSetup().g62_finished(date=f'{year}-11-10')
        DBSetup().g72_finished(date=f'{year}-08-13')
        expected_overall_table = get_df_from_json('league_table_overall.json')
        league_table = LeagueTable()
        assert league_table.get_standing(year).to_json() == expected_overall_table.to_json()

    def test_league_table_by_division_current_year_implicit(self):
        today = datetime.date.today()
        DBSetup().g72_finished(date=today)
        DBSetup().g62_finished(date=today)
        season = Season.objects.create(name=f'{today.year}')
        west = League.objects.create(name='west')
        south = League.objects.create(name='south')
        teams_A = Team.objects.filter(name__startswith='A')
        teams_B = Team.objects.filter(name__startswith='B')
        for team in teams_A:
            SeasonLeagueTeam.objects.create(season=season, league=south, team=team)
        for team in teams_B:
            SeasonLeagueTeam.objects.create(season=season, league=west, team=team)
        expected_overall_table = get_df_from_json('league_table_division_south.json')
        league_table = LeagueTable()
        assert league_table.get_standing(league='south').to_json() == expected_overall_table.to_json()

    def test_league_table_by_division_for_multiple_seasons(self):
        year = datetime.date.today().year
        year_minus_one = year - 1
        year_plus_one = year + 1
        DBSetup().g62_finished(date=f'{year}-10-10')
        DBSetup().g72_finished(date=f'{year_minus_one}-01-23')
        DBSetup().g62_finished(date=f'{year_plus_one}-11-10')
        DBSetup().g72_finished(date=f'{year_plus_one}-08-13')
        all_seasons = [
            Season.objects.create(name=f'{year_plus_one}'),
            Season.objects.create(name=f'{year_minus_one}'),
            Season.objects.create(name=f'{year}')
        ]
        west = League.objects.create(name='west')
        south = League.objects.create(name='south')
        teams_A = Team.objects.filter(name__startswith='A')
        teams_B = Team.objects.filter(name__startswith='B')
        for season in all_seasons:
            for team in teams_A:
                SeasonLeagueTeam.objects.create(season=season, league=south, team=team)
            for team in teams_B:
                SeasonLeagueTeam.objects.create(season=season, league=west, team=team)
        expected_overall_table = get_df_from_json('league_table_division_south.json')
        league_table = LeagueTable()
        assert league_table.get_standing(league='south',
                                         season=year_plus_one).to_json() == expected_overall_table.to_json()

    def test_league_table_by_illegal_league_name(self):
        today = datetime.date.today()
        DBSetup().g72_finished(date=today)
        DBSetup().g62_finished(date=today)
        league_table = LeagueTable()
        assert league_table.get_standing(league='non existent league').empty
