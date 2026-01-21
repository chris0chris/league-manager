from datetime import datetime

import pytest
from django.test import TestCase

from gamedays.models import Team
from officials.service.official_service import OfficialService
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials


class TestOfficialService(TestCase):
    def test_no_officials_found(self):
        official_service = OfficialService()
        with pytest.raises(Team.DoesNotExist):
            official_service.get_all_officials_with_team_infos(
                team_id=1, season=datetime.today().year, is_staff=True
            )

    def test_officials_for_team_id(self):
        official_service = OfficialService()
        team = DbSetupOfficials().create_officials_full_setup()
        year = datetime.today().year
        result_list = official_service.get_all_officials_with_team_infos(
            team_id=team.pk, season=year, is_staff=True
        )
        assert len(result_list["officials_list"]) == 2
        assert result_list["season"] == year
        assert result_list["team"] == team.description
        assert result_list["team_id"] == team.pk
        assert len(result_list["years"]) == 3

    def test_officials_for_team_id_and_specific_year(self):
        official_service = OfficialService()
        team = DbSetupOfficials().create_officials_full_setup()
        result_list = official_service.get_all_officials_with_team_infos(
            team_id=team.pk, season=2020, is_staff=False
        )
        assert len(result_list["officials_list"]) == 1
        assert result_list["season"] == 2020
