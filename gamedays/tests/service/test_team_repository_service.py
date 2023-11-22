from django.test import TestCase

from gamedays.service.team_repository_service import TeamRepositoryService
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestTeamRepositoryService(TestCase):
    def test_get_description(self):
        team = DBSetup().create_teams('E', 1)[0]
        team_repo_service = TeamRepositoryService(team.pk)
        assert team_repo_service.get_team_description() == 'EEEEEEE1'

    def test_get_team_id(self):
        team = DBSetup().create_teams('E', 1)[0]
        team_repo_service = TeamRepositoryService(team.pk)
        assert team_repo_service.get_team_id() == team.pk
