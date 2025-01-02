from django.urls import reverse
from django_webtest import WebTest

from gamedays.models import Season, League, Team, SeasonLeagueTeam
from gamedays.tests.setup_factories.db_setup import DBSetup


# class TestLeagueTableView(WebTest):
#     def test_league_table_for_year_is_displayed(self):
#         DBSetup().g72_finished()
#         DBSetup().g62_finished()
#         response = self.app.get(reverse('league-table-overall'))
#         assert 'team__name' in response.context['info']['schedule']
#
#     def test_league_table_for_league_is_displayed(self):
#         DBSetup().g72_finished()
#         DBSetup().g62_finished()
#         season = Season.objects.first()
#         west = League.objects.create(name='west')
#         south = League.objects.create(name='south')
#         teams_A = Team.objects.filter(name__startswith='A')
#         teams_B = Team.objects.filter(name__startswith='B')
#         for team in teams_A:
#             SeasonLeagueTeam.objects.create(season=season, league=south, team=team)
#         for team in teams_B:
#             SeasonLeagueTeam.objects.create(season=season, league=west, team=team)
#         response = self.app.get(reverse('league-table-league', kwargs={'season': season, 'league': south}))
#         assert 'team__name' in response.context['info']['schedule']
