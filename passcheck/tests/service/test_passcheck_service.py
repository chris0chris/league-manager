from django.contrib.auth.models import User
from django.test import TestCase

from gamedays.tests.setup_factories.db_setup import DBSetup
from passcheck.models import PlayerlistGameday, PasscheckVerification
from passcheck.service.passcheck_service import PasscheckServicePlayers
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck


class TestPasscheckService(TestCase):
    def test_entries_playerlist_gameday_are_created(self):
        team, female, young, _ = DbSetupPasscheck.create_playerlist_for_team()
        gameday = DBSetup().create_empty_gameday()
        user = User.objects.first()
        passcheck_service_players = PasscheckServicePlayers()
        passcheck_service_players.create_roster_and_passcheck_verification(
            team_id=team.pk,
            gameday_id=gameday.pk,
            user=user,
            data={
                "official_name": "",
                "roster": [
                    {
                        "id": young.pk,
                        "first_name": "a",
                        "last_name": "b",
                        "jersey_number": 4,
                        "pass_number": 3,
                        "sex": 2,
                        "gamedays_counter": {"6": 3, "7": 0, "8": 0},
                        "key": 0,
                        "isSelected": True,
                    },
                    {
                        "id": female.pk,
                        "first_name": "Julia",
                        "last_name": "K",
                        "jersey_number": 7,
                        "pass_number": 7,
                        "sex": 1,
                        "gamedays_counter": {"6": 4, "7": 3, "8": 3},
                        "key": 1,
                        "isSelected": True,
                    },
                ],
            },
        )
        all_playerlist_gamedays = PlayerlistGameday.objects.all()
        last_entry: PlayerlistGameday = all_playerlist_gamedays.last()
        assert all_playerlist_gamedays.count() == 8
        assert last_entry.gameday_id == gameday.pk
        assert last_entry.gameday_jersey == 7
        assert last_entry.playerlist_id == female.pk

    def test_entries_playerlist_gameday_are_updated(self):
        team, female, _, _ = DbSetupPasscheck.create_playerlist_for_team()
        gameday = DBSetup().create_empty_gameday()
        another_gameday = DBSetup().create_empty_gameday()
        user = User.objects.first()
        passcheck_service_players = PasscheckServicePlayers()
        PlayerlistGameday.objects.create(
            playerlist=female, gameday=gameday, gameday_jersey=99
        )
        PlayerlistGameday.objects.create(
            playerlist=female, gameday=another_gameday, gameday_jersey=9
        )
        passcheck_service_players.create_roster_and_passcheck_verification(
            team_id=team.pk,
            gameday_id=gameday.pk,
            user=user,
            data={
                "official_name": "",
                "roster": [{"id": female.pk, "jersey_number": 7}],
            },
        )
        all_playerlist_gamedays = PlayerlistGameday.objects.all()
        first_entry: PlayerlistGameday = all_playerlist_gamedays.last()
        assert all_playerlist_gamedays.count() == 8
        assert first_entry.gameday_jersey == 7

    def test_entries_are_deleted_and_created(self):
        team, female, young, _ = DbSetupPasscheck.create_playerlist_for_team()
        gameday = DBSetup().create_empty_gameday()
        user = User.objects.first()
        passcheck_service_players = PasscheckServicePlayers()
        PlayerlistGameday.objects.create(
            playerlist=female, gameday=gameday, gameday_jersey=99
        )
        passcheck_service_players.create_roster_and_passcheck_verification(
            team_id=team.pk,
            user=user,
            gameday_id=gameday.pk,
            data={
                "official_name": "",
                "roster": [
                    {
                        "id": young.pk,
                        "first_name": "Yon",
                        "last_name": "Young",
                        "jersey_number": 0,
                        "pass_number": 0,
                        "sex": 2,
                        "gamedays_counter": {"6": 4, "7": 3, "8": 3},
                        "key": 1,
                        "isSelected": True,
                    }
                ],
            },
        )
        all_playerlist_gamedays = PlayerlistGameday.objects.all()
        assert all_playerlist_gamedays.count() == 7

    def test_passcheck_verification_is_created(self):
        team = DBSetup().create_teams("VerifyTeam", 1)[0]
        gameday = DBSetup().create_empty_gameday()
        user = User.objects.first()
        passcheck_service_players = PasscheckServicePlayers()
        passcheck_service_players.create_roster_and_passcheck_verification(
            team_id=team.pk,
            gameday_id=gameday.pk,
            user=user,
            data={
                "official_name": "Verified Official",
                "note": "some note",
                "roster": [],
            },
        )
        verification_entry = PasscheckVerification.objects.all()
        entry: PasscheckVerification = verification_entry.first()
        assert len(verification_entry) == 1
        assert entry.official_name == "Verified Official"
        assert entry.note == "some note"
        assert entry.created_at.strftime("%H:%M:%S") == entry.updated_at.strftime(
            "%H:%M:%S"
        )

    def test_passcheck_verification_is_updated(self):
        team = DBSetup().create_teams("VerifyTeam", 1)[0]
        gameday = DBSetup().create_empty_gameday()
        user = User.objects.first()
        PasscheckVerification.objects.create(
            team=team, gameday=gameday, user=user, official_name="Initial official name"
        )
        passcheck_service_players = PasscheckServicePlayers()
        passcheck_service_players.create_roster_and_passcheck_verification(
            team_id=team.pk,
            gameday_id=gameday.pk,
            user=user,
            data={"official_name": "Verified Official", "roster": []},
        )
        entry: PasscheckVerification = PasscheckVerification.objects.first()
        assert entry.official_name == "Verified Official"
        assert entry.created_at < entry.updated_at
