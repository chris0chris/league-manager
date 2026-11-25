from datetime import datetime, timedelta

from django.test import TestCase

from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import (
    TeamFactory,
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
)
from officials.models import Official, OfficialLicense
from officials.service.officials_repository_service import OfficialsRepositoryService
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import (
    OfficialFactory,
    OfficialLicenseFactory,
    OfficialLicenseHistoryFactory,
    OfficialExternalGamesFactory,
)


class TestOfficialsRepositoryService(TestCase):
    def test_get_officials_game_count_for_license(self):
        DbSetupOfficials().create_officials_full_setup()
        DbSetupOfficials().create_external_officials_entries()
        year = datetime.today()
        test_external_ids = ["5", "7"]
        license_ids = OfficialLicense.objects.all().values_list("pk", flat=True)

        # Call the method being tested
        official_repository_service = OfficialsRepositoryService()
        officials = official_repository_service.get_officials_game_count_for_license(
            year, test_external_ids, license_ids
        )

        # Check that the correct officials are returned
        assert len(officials) == 2

        current_year = datetime.now().year
        previous_year = current_year - 1

        # Assert values for the first official
        official_1_data = officials[0]
        assert official_1_data.license_name == "F1"
        assert official_1_data.license_years == f"2020,{previous_year},{current_year}"
        assert official_1_data.total_season_games == 11
        assert official_1_data.total_games == 21

        # Assert values for the second official
        official_2_data = officials[1]
        assert official_2_data.license_name == "F2"
        assert official_2_data.license_years == f"{previous_year},{current_year}"
        assert official_2_data.total_season_games == 15
        # noinspection PyComparisonWithFloats result will always be sharp .0 or .5
        assert official_2_data.total_games == 21.5


class TestGetTeamLicenseBreakdown(TestCase):
    def test_breaks_down_officials_by_team_using_best_ranked_most_recent_license(self):
        team_a = TeamFactory(name="Team A")
        team_b = TeamFactory(name="Team B")
        association = DBSetup().create_new_association()
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        license_f2 = OfficialLicenseFactory(id=3, name="F2")

        # Two licenses taken in the same year - the higher rank (F1) must
        # win, even though the lower-ranked (F2) one is more recent.
        official_1 = OfficialFactory(
            first_name="A",
            last_name="One",
            team=team_a,
            association=association,
            external_id="1",
        )
        OfficialLicenseHistoryFactory(
            official=official_1,
            license=license_f2,
            created_at="2020-02-01",
        )
        OfficialLicenseHistoryFactory(
            official=official_1,
            license=license_f1,
            created_at="2020-08-01",
        )

        # No license history at all -> not counted in any license bucket,
        # only towards the team's total.
        OfficialFactory(
            first_name="B",
            last_name="Two",
            team=team_a,
            association=association,
            external_id="2",
        )

        # A license taken years ago is still their "current" one - there
        # is no expiration cutoff here, matching the same convention
        # already used by the per-team officials list / profile pages
        # (OfficialSerializer._get_license_history).
        official_3 = OfficialFactory(
            first_name="C",
            last_name="Three",
            team=team_b,
            association=association,
            external_id="3",
        )
        OfficialLicenseHistoryFactory(
            official=official_3,
            license=license_f1,
            created_at="2015-01-01",
        )

        # Officials reassigned to the "no team" placeholder must not be
        # counted against any real team.
        no_team = TeamFactory(pk=Official.OHNE_TEAM_ID, name="Ohne Team")
        OfficialFactory(
            first_name="D",
            last_name="Four",
            team=no_team,
            association=association,
            external_id="4",
        )

        service = OfficialsRepositoryService()
        with self.assertNumQueries(1):
            breakdown = service.get_team_license_breakdown()

        assert breakdown[team_a.pk]["total"] == 2
        assert breakdown[team_a.pk]["F1"] == 1
        assert "F2" not in breakdown[team_a.pk]
        assert breakdown[team_b.pk] == {"total": 1, "F1": 1}
        assert Official.OHNE_TEAM_ID not in breakdown

    def test_query_count_does_not_scale_with_number_of_teams_or_officials(self):
        association = DBSetup().create_new_association()
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        for team_index in range(10):
            team = TeamFactory(name=f"Team {team_index}")
            for official_index in range(5):
                official = OfficialFactory(
                    first_name=f"First{team_index}{official_index}",
                    last_name=f"Last{team_index}{official_index}",
                    team=team,
                    association=association,
                    external_id=f"{team_index}-{official_index}",
                )
                if official_index % 2 == 0:
                    OfficialLicenseHistoryFactory(
                        official=official,
                        license=license_f1,
                        created_at="2021-06-01",
                    )

        service = OfficialsRepositoryService()
        with self.assertNumQueries(1):
            service.get_team_license_breakdown()


class TestGetOfficialsStatisticsForSeason(TestCase):
    @staticmethod
    def _game_official(gameday, position, official):
        gameinfo = GameinfoFactory(gameday=gameday)
        GameOfficialFactory(gameinfo=gameinfo, position=position, official=official)

    def test_ranks_by_leaguesphere_games_and_ignores_scorecard_judge_and_external(
        self,
    ):
        team_a = TeamFactory(name="Team A", description="Team A")
        team_b = TeamFactory(name="Team B", description="Team B")
        association = DBSetup().create_new_association()
        official_a = OfficialFactory(
            first_name="Anna",
            last_name="Aachen",
            team=team_a,
            association=association,
            external_id="a",
        )
        official_b = OfficialFactory(
            first_name="Ben",
            last_name="Berlin",
            team=team_b,
            association=association,
            external_id="b",
        )
        official_c = OfficialFactory(
            first_name="Carla",
            last_name="Cottbus",
            team=team_a,
            association=association,
            external_id="c",
        )

        gameday_2024 = GamedayFactory(date="2024-05-01")
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        # A license taken earlier in the SAME season year it applies to
        # must still count - this reproduces official #2435's real bug
        # report: their license was earned 2025-03-31 and they only ever
        # officiated in season 2025, so an off-by-one-year rule that only
        # started counting it from season 2026 onward left it blank here.
        OfficialLicenseHistoryFactory(
            official=official_a,
            license=license_f1,
            created_at="2024-02-01",
        )

        # Official A: 3 Referee + 2 Down Judge (=5 total) + 1 Scorecard
        # Judge game that must not affect any count.
        self._game_official(gameday_2024, "Referee", official_a)
        self._game_official(gameday_2024, "Referee", official_a)
        self._game_official(gameday_2024, "Referee", official_a)
        self._game_official(gameday_2024, "Down Judge", official_a)
        self._game_official(gameday_2024, "Down Judge", official_a)
        self._game_official(gameday_2024, "Scorecard Judge", official_a)

        # Official B: 2 Referee + 1 Field Judge (=3 total), plus a large
        # external-games total that must NOT outrank official A.
        self._game_official(gameday_2024, "Referee", official_b)
        self._game_official(gameday_2024, "Referee", official_b)
        self._game_official(gameday_2024, "Field Judge", official_b)
        OfficialExternalGamesFactory(
            official=official_b,
            number_games=10,
            date="2024-06-01",
            notification_date="2024-06-01",
            position="Referee",
            association=association,
            is_international=False,
            has_clockcontrol=True,
            halftime_duration=15,
            reporter_name="reporter",
            comment="",
        ).save()

        # Official C: only officiated in a different season - must be
        # excluded entirely from the 2024 statistics.
        gameday_2023 = GamedayFactory(date="2023-05-01")
        self._game_official(gameday_2023, "Referee", official_c)

        service = OfficialsRepositoryService()
        # Both the "without_external" and "with_external" leaderboards
        # are built from a single fetched dataset. minimum_games=0 here
        # since this test is about the per-official counts, not the
        # top-N/minimum-games cutoff (covered separately below) - both
        # officials have fewer than the default 10 games.
        with self.assertNumQueries(1):
            result = service.get_officials_statistics_for_season(2024, minimum_games=0)
            officials = result["without_external"]
            # access .team inside the same query-count block to prove
            # select_related("team") prevents a follow-up query per row.
            team_descriptions = [official.team.description for official in officials]

        assert [o.pk for o in officials] == [official_a.pk, official_b.pk]
        assert team_descriptions == ["Team A", "Team B"]

        stats_a = officials[0]
        assert stats_a.referee_count == 3
        assert stats_a.down_judge_count == 2
        assert stats_a.field_judge_count == 0
        assert stats_a.side_judge_count == 0
        assert stats_a.total_games == 5
        # All 5 of A's counted games are separate Gameinfo rows but on the
        # SAME single Gameday (gameday_2024) - one Spieltag attended.
        assert stats_a.unique_gamedays_count == 1
        assert stats_a.external_games_total == 0
        assert stats_a.license_name == "F1"

        stats_b = officials[1]
        assert stats_b.referee_count == 2
        assert stats_b.down_judge_count == 0
        assert stats_b.field_judge_count == 1
        assert stats_b.side_judge_count == 0
        assert stats_b.total_games == 3
        assert stats_b.unique_gamedays_count == 1
        assert stats_b.external_games_total == 10
        assert stats_b.license_name is None

    def test_unique_gamedays_count_counts_distinct_spieltage_not_games_or_positions(
        self,
    ):
        team = TeamFactory(name="Team A", description="Team A")
        association = DBSetup().create_new_association()
        official = OfficialFactory(
            first_name="Anna",
            last_name="Aachen",
            team=team,
            association=association,
            external_id="a",
        )
        gameday_a = GamedayFactory(date="2024-05-01")
        gameday_b = GamedayFactory(date="2024-05-08")

        # Two different games on the SAME Spieltag - must only count as
        # one Spieltag attended, even though it's 2 distinct games.
        self._game_official(gameday_a, "Referee", official)
        self._game_official(gameday_a, "Down Judge", official)

        # A game on a different Spieltag - must increment the count.
        self._game_official(gameday_b, "Referee", official)

        stats = OfficialsRepositoryService().get_officials_statistics_for_season(
            2024, minimum_games=0
        )
        official_stats = next(
            o for o in stats["without_external"] if o.pk == official.pk
        )

        assert official_stats.total_games == 3
        assert official_stats.unique_gamedays_count == 2

    def test_license_from_a_later_year_does_not_leak_into_an_earlier_season(self):
        team = TeamFactory(name="Team A", description="Team A")
        association = DBSetup().create_new_association()
        official = OfficialFactory(
            first_name="Anna",
            last_name="Aachen",
            team=team,
            association=association,
            external_id="a",
        )
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        OfficialLicenseHistoryFactory(
            official=official, license=license_f1, created_at="2025-01-01"
        )

        gameday_2024 = GamedayFactory(date="2024-05-01")
        self._game_official(gameday_2024, "Referee", official)

        result = OfficialsRepositoryService().get_officials_statistics_for_season(
            2024, minimum_games=0
        )

        assert result["without_external"][0].license_name is None

    def test_query_count_does_not_scale_with_number_of_officials_or_games(self):
        association = DBSetup().create_new_association()
        gameday = GamedayFactory(date="2024-05-01")
        for i in range(10):
            team = TeamFactory(name=f"Team {i}")
            official = OfficialFactory(
                first_name=f"First{i}",
                last_name=f"Last{i}",
                team=team,
                association=association,
                external_id=f"{i}",
            )
            self._game_official(gameday, "Referee", official)
            self._game_official(gameday, "Down Judge", official)

        service = OfficialsRepositoryService()
        with self.assertNumQueries(1):
            service.get_officials_statistics_for_season(2024)

    def test_top_n_slice_is_filtered_out_entirely_when_none_meet_the_minimum(self):
        # top_n and minimum_games intersect (AND), not a union: taking
        # the top 3 by rank and then requiring >= 10 games each can leave
        # fewer than 3 - here, zero, since none has anywhere near 10.
        association = DBSetup().create_new_association()
        gameday = GamedayFactory(date="2024-05-01")
        team = TeamFactory(name="Team A", description="Team A")
        for i in range(5):
            official = OfficialFactory(
                first_name=f"First{i}",
                last_name=f"Last{i}",
                team=team,
                association=association,
                external_id=f"{i}",
            )
            self._game_official(gameday, "Referee", official)

        service = OfficialsRepositoryService()
        result = service.get_officials_statistics_for_season(
            2024, top_n=3, minimum_games=10
        )

        assert result["without_external"] == []
        assert result["with_external"] == []

    def test_result_never_exceeds_top_n_even_if_more_officials_meet_the_minimum(
        self,
    ):
        # 5 officials all clear minimum_games=2, but top_n=3 must still
        # cap the result at 3 - the old (wrong) "union" behavior would
        # have extended this to all 5.
        association = DBSetup().create_new_association()
        gameday = GamedayFactory(date="2024-05-01")
        team = TeamFactory(name="Team A", description="Team A")
        for i in range(5):
            official = OfficialFactory(
                first_name=f"First{i}",
                last_name=f"Last{i}",
                team=team,
                association=association,
                external_id=f"{i}",
            )
            for _ in range(2):
                self._game_official(gameday, "Referee", official)

        service = OfficialsRepositoryService()
        result = service.get_officials_statistics_for_season(
            2024, top_n=3, minimum_games=2
        )

        assert len(result["without_external"]) == 3
        assert len(result["with_external"]) == 3

    def test_with_external_variant_ranks_by_combined_totals(self):
        team = TeamFactory(name="Team A", description="Team A")
        association = DBSetup().create_new_association()
        official_a = OfficialFactory(
            first_name="Anna",
            last_name="Aachen",
            team=team,
            association=association,
            external_id="a",
        )
        official_b = OfficialFactory(
            first_name="Ben",
            last_name="Berlin",
            team=team,
            association=association,
            external_id="b",
        )
        gameday_2024 = GamedayFactory(date="2024-05-01")

        # Official A: 8 LeagueSphere games, no external games.
        for _ in range(8):
            self._game_official(gameday_2024, "Referee", official_a)

        # Official B: only 3 LeagueSphere games, but 20 external games -
        # must NOT outrank A "without_external", but MUST outrank A once
        # external games are added into "with_external".
        for _ in range(3):
            self._game_official(gameday_2024, "Referee", official_b)
        OfficialExternalGamesFactory(
            official=official_b,
            number_games=20,
            date="2024-06-01",
            notification_date="2024-06-01",
            position="Referee",
            association=association,
            is_international=False,
            has_clockcontrol=True,
            halftime_duration=15,
            reporter_name="reporter",
            comment="",
        ).save()

        service = OfficialsRepositoryService()
        # minimum_games=0 isolates the ranking/ordering itself from the
        # cutoff threshold (covered separately below) - both officials
        # have fewer than the default 10 LeagueSphere games.
        result = service.get_officials_statistics_for_season(2024, minimum_games=0)

        assert [o.pk for o in result["without_external"]] == [
            official_a.pk,
            official_b.pk,
        ]
        assert [o.pk for o in result["with_external"]] == [
            official_b.pk,
            official_a.pk,
        ]

        b_with_external = result["with_external"][0]
        assert b_with_external.total_games == 3
        assert b_with_external.external_games_total == 20
        assert b_with_external.total_games_with_external == 23

    def test_with_external_variant_applies_the_minimum_games_threshold_differently(
        self,
    ):
        # Same top_n for both variants, large enough to keep both
        # officials in the ranked slice - but the minimum_games=10 floor
        # is evaluated on a different total per variant, so it can keep
        # an official in "with_external" while dropping them from
        # "without_external".
        team = TeamFactory(name="Team A", description="Team A")
        association = DBSetup().create_new_association()
        gameday_2024 = GamedayFactory(date="2024-05-01")

        official_a = OfficialFactory(
            first_name="Anna",
            last_name="Aachen",
            team=team,
            association=association,
            external_id="a",
        )
        for _ in range(15):
            self._game_official(gameday_2024, "Referee", official_a)

        # Official B: 2 LeagueSphere games (below 10) + 9 external
        # (2 + 9 = 11, above 10 once combined).
        official_b = OfficialFactory(
            first_name="Ben",
            last_name="Berlin",
            team=team,
            association=association,
            external_id="b",
        )
        for _ in range(2):
            self._game_official(gameday_2024, "Referee", official_b)
        OfficialExternalGamesFactory(
            official=official_b,
            number_games=9,
            date="2024-06-01",
            notification_date="2024-06-01",
            position="Referee",
            association=association,
            is_international=False,
            has_clockcontrol=True,
            halftime_duration=15,
            reporter_name="reporter",
            comment="",
        ).save()

        service = OfficialsRepositoryService()
        result = service.get_officials_statistics_for_season(
            2024, top_n=2, minimum_games=10
        )

        without_external_pks = [o.pk for o in result["without_external"]]
        with_external_pks = [o.pk for o in result["with_external"]]

        assert without_external_pks == [official_a.pk]
        assert official_b.pk not in without_external_pks
        assert with_external_pks == [official_a.pk, official_b.pk]
