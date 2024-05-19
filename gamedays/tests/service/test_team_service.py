from django.test import TestCase

from gamedays.service.team_service import TeamService
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestTeamService(TestCase):
    def setUp(self):
        teams = DBSetup().create_teams('Team Service', 2)
        self.team1 = teams[0]
        self.team2 = teams[1]

    def test_get_team_by_name(self):
        team = TeamService.get_team_by_id_or_name(self.team1.name)
        assert team == self.team1

    def test_get_team_by_id(self):
        team = TeamService.get_team_by_id_or_name(self.team2.pk)
        assert team == self.team2

    def test_get_nonexistent_team(self):
        team = TeamService.get_team_by_id_or_name("Nonexistent Team")
        assert team is None

    def test_get_team_invalid_id(self):
        invalid_id = 0
        team = TeamService.get_team_by_id_or_name(invalid_id)
        assert team is None