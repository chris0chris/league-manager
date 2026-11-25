from datetime import datetime

import pytest
from django.core.cache import cache
from django.test import TestCase

from gamedays.models import Gameinfo, GameOfficial, Team
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.models import Official, OfficialExternalGames
from officials.service.official_service import OfficialService
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import (
    OfficialFactory,
    OfficialLicenseFactory,
    OfficialLicenseHistoryFactory,
)


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


class TestGetAllTeamsWithLicenseBreakdown(TestCase):
    def setUp(self):
        # get_all_teams() caches under a fixed "all_teams" key for 24h -
        # must be cleared so tests don't see stale/cross-test team lists.
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_combines_teams_with_their_license_breakdown(self):
        team = TeamFactory(name="Team A")
        association = DBSetup().create_new_association()
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        official = OfficialFactory(
            first_name="A",
            last_name="One",
            team=team,
            association=association,
            external_id="1",
        )
        OfficialLicenseHistoryFactory(
            official=official,
            license=license_f1,
            created_at="2021-06-01",
        )

        result = OfficialService().get_all_teams_with_license_breakdown()

        entry = next(
            e for e in result["teams_with_breakdown"] if e["team"].pk == team.pk
        )
        assert entry["license_breakdown"]["total"] == 1
        assert entry["license_breakdown"]["F1"] == 1
        assert result["license_levels"] == ["F1", "F2", "F3", "F4"]
        assert "no_license_label" not in result

    def test_team_with_no_officials_has_empty_breakdown(self):
        team = TeamFactory(name="Empty Team")

        result = OfficialService().get_all_teams_with_license_breakdown()

        entry = next(
            e for e in result["teams_with_breakdown"] if e["team"].pk == team.pk
        )
        assert entry["license_breakdown"] == {}

    def test_reuses_all_teams_cache_across_calls(self):
        TeamFactory(name="Team A")
        service = OfficialService()

        # Cold cache: 1 query for the team list, 1 for the license breakdown.
        with self.assertNumQueries(2):
            service.get_all_teams_with_license_breakdown()

        # Warm cache: team list served from cache, only the (uncached)
        # license breakdown query runs.
        with self.assertNumQueries(1):
            service.get_all_teams_with_license_breakdown()


class TestCreateExternalOfficialEntry(TestCase):
    def setUp(self):
        DbSetupOfficials.create_production_associations()

    def test_creates_an_official_external_games_row_from_a_dict(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)

        message = OfficialService().create_external_official_entry(
            {
                "official_id": official.pk,
                "number_games": 2,
                "date": "2024-05-01",
                "position": "Referee",
                "association": "Hamburg",
                "halftime_duration": 20,
            }
        )

        assert OfficialExternalGames.objects.count() == 1
        assert "Franzi Fedora" in message or "Fedora" in message


class TestCreateInternalFixEntry(TestCase):
    def test_creates_a_game_official_row_when_no_match_exists(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()

        OfficialService().create_internal_fix_entry(
            {
                "gameinfo_id": gameinfo.pk,
                "official_id": official.pk,
                "position": "Referee",
            }
        )

        assert GameOfficial.objects.filter(
            gameinfo=gameinfo, position="Referee", official=official
        ).exists()
