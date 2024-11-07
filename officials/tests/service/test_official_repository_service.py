from datetime import datetime

from django.test import TestCase

from gamedays.models import GameOfficial
from officials.models import OfficialExternalGames, Official, OfficialLicense, OfficialLicenseHistory
from officials.service.officials_repository_service import OfficialsRepositoryService
from officials.service.serializers import OfficialLicenseCheckSerializer
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials


class TestOfficialsRepositoryService(TestCase):
    def test_get_officials_game_count_for_license(self):
        DbSetupOfficials().create_officials_full_setup()
        year = datetime.today().year
        test_external_ids = ['5', '7']
        license_ids = OfficialLicense.objects.all().values_list('pk', flat=True)

        # Call the method being tested
        official_repository_service = OfficialsRepositoryService()
        officials = official_repository_service.get_officials_game_count_for_license(year, test_external_ids,
                                                                                     license_ids)

        # Check that the correct officials are returned
        assert len(officials) == 2

        # Assert values for the first official
        official_1_data = officials[0]
        assert official_1_data.license_name == 'F1'
        assert official_1_data.license_years == '2020,2024'
        assert official_1_data.total_season_games == 4
        assert official_1_data.total_games == 8

        # Assert values for the second official
        official_2_data = officials[1]
        assert official_2_data.license_name == 'F2'
        assert official_2_data.license_years == '2023,2024'
        assert official_2_data.total_season_games == 8
        assert official_2_data.total_games == 12
