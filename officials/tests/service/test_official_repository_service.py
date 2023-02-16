from datetime import datetime

from django.test import TestCase

from officials.models import OfficialExternalGames, Official
from officials.service.officials_repository_service import OfficialGameCount
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from teammanager.models import GameOfficial


class TestOfficialGameCount(TestCase):
    def test_get_all_internal_games(self):
        DbSetupOfficials().create_officials_full_setup()
        official = Official.objects.first()
        year = datetime.today().year
        official_qs = GameOfficial.objects.filter(official=official).exclude(position='Scorecard Judge')
        official_game_count = OfficialGameCount(year, official, official_qs, OfficialExternalGames.objects.none())
        assert official_game_count.get_all_internal_games() == 8

    def test_get_current_season_internal(self):
        DbSetupOfficials().create_officials_full_setup()
        official = Official.objects.last()
        year = datetime.today().year
        official_qs = GameOfficial.objects.filter(official=official).exclude(position='Scorecard Judge')
        official_game_count = OfficialGameCount(year, official, official_qs, OfficialExternalGames.objects.none())
        assert official_game_count.get_current_season_internal() == 8

    def test_get_all_external_games(self):
        DbSetupOfficials().create_officials_full_setup()
        DbSetupOfficials().create_external_officials_entries()
        official = Official.objects.last()
        year = datetime.today().year
        external_official_qs = OfficialExternalGames.objects.filter(official=official)
        official_game_count = OfficialGameCount(year, official, OfficialExternalGames.objects.none(),
                                                external_official_qs)
        assert official_game_count.get_all_external_games() == 12

    def test_get_current_season_external(self):
        DbSetupOfficials().create_officials_full_setup()
        DbSetupOfficials().create_external_officials_entries()
        official = Official.objects.first()
        year = datetime.today().year
        external_official_qs = OfficialExternalGames.objects.filter(official=official)
        official_game_count = OfficialGameCount(year, official, OfficialExternalGames.objects.none(),
                                                external_official_qs)
        assert official_game_count.get_current_season_external() == 10

    def test_official_game_count_as_json(self):
        DbSetupOfficials().create_officials_full_setup()
        DbSetupOfficials().create_external_officials_entries()
        official = Official.objects.first()
        year = datetime.today().year
        official_qs = GameOfficial.objects.filter(official=official).exclude(position='Scorecard Judge')
        external_official_qs = OfficialExternalGames.objects.filter(official=official)
        official_game_count = OfficialGameCount(year, official, official_qs,
                                                external_official_qs)
        assert official_game_count.as_json() == {
            'external_id': official.external_id,
            'team': official.team.description,
            'last_name': official.last_name,
            'first_name': official.first_name,
            'last_license': 'F1',
            'license_year': year,
            'current_season': 14,
            'overall': 24,
        }
