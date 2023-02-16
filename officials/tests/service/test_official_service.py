from datetime import datetime

from django.test import TestCase

from officials.service.official_service import OfficialService
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials


class TestOfficialService(TestCase):
    def test_no_officials_found(self):
        official_service = OfficialService()
        officials = official_service.get_officials_for(team_id=1, year=datetime.today().year)
        assert len(officials['officials_list']['list']) == 0

    def test_officials_for_team_id(self):
        official_service = OfficialService()
        team = DbSetupOfficials().create_officials_full_setup()
        result_list = official_service.get_officials_for(team_id=team.pk, year=datetime.today().year)
        assert len(result_list['officials_list']['list']) == 2

    def test_officials_for_team_id_and_specific_year(self):
        official_service = OfficialService()
        team = DbSetupOfficials().create_officials_full_setup()
        result_list = official_service.get_officials_for(team_id=team.pk, year=2020)
        assert len(result_list['officials_list']['list']) == 1
        assert result_list['year'] == 2020
