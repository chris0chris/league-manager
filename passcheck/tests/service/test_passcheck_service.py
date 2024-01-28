from django.test import TestCase

from gamedays.tests.setup_factories.db_setup import DBSetup
from passcheck.models import PlayerlistGameday
from passcheck.service.passcheck_service import PasscheckServicePlayers
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck


class TestPasscheckService(TestCase):
    def test_entries_playerlist_gameday_are_created(self):
        team, female, young, _ = DbSetupPasscheck.create_playerlist_for_team()
        gameday = DBSetup().create_empty_gameday()
        passcheck_service_players = PasscheckServicePlayers()
        passcheck_service_players.create_roster(team_id=team.pk, gameday_id=gameday.pk, roster=[
            {'id': young.pk, 'first_name': 'a', 'last_name': 'b', 'jersey_number': 4, 'pass_number': 3, 'sex': 2,
             'gamedays_counter': {'6': 3, '7': 0, '8': 0}, 'key': 0, 'isSelected': True},
            {'id': female.pk, 'first_name': 'Julia', 'last_name': 'K', 'jersey_number': 7, 'pass_number': 7, 'sex': 1,
             'gamedays_counter': {'6': 4, '7': 3, '8': 3}, 'key': 1, 'isSelected': True}])
        all_playerlist_gamedays = PlayerlistGameday.objects.all()
        first_entry: PlayerlistGameday = all_playerlist_gamedays.first()
        assert all_playerlist_gamedays.count() == 2
        assert first_entry.gameday_id == gameday.pk
        assert first_entry.gameday_jersey == 4
        assert first_entry.playerlist_id == young.pk

    def test_entries_playerlist_gameday_are_updated(self):
        team, female, _, _ = DbSetupPasscheck.create_playerlist_for_team()
        gameday = DBSetup().create_empty_gameday()
        passcheck_service_players = PasscheckServicePlayers()
        PlayerlistGameday.objects.create(playerlist=female, gameday=gameday, gameday_jersey=99)
        passcheck_service_players.create_roster(team_id=team.pk, gameday_id=gameday.pk, roster=[
            {'id': female.pk, 'first_name': 'Julia', 'last_name': 'K', 'jersey_number': 7, 'pass_number': 7, 'sex': 1,
             'gamedays_counter': {'6': 4, '7': 3, '8': 3}, 'key': 1, 'isSelected': True}])
        all_playerlist_gamedays = PlayerlistGameday.objects.all()
        first_entry: PlayerlistGameday = all_playerlist_gamedays.first()
        assert all_playerlist_gamedays.count() == 1
        assert first_entry.gameday_jersey == 7

    def test_entries_are_deleted_and_created(self):
        team, female, young, _ = DbSetupPasscheck.create_playerlist_for_team()
        gameday = DBSetup().create_empty_gameday()
        passcheck_service_players = PasscheckServicePlayers()
        PlayerlistGameday.objects.create(playerlist=female, gameday=gameday, gameday_jersey=99)
        passcheck_service_players.create_roster(team_id=team.pk, gameday_id=gameday.pk, roster=[
            {'id': young.pk, 'first_name': 'Yon', 'last_name': 'Young', 'jersey_number': 0, 'pass_number': 0, 'sex': 2,
             'gamedays_counter': {'6': 4, '7': 3, '8': 3}, 'key': 1, 'isSelected': True}])
        all_playerlist_gamedays = PlayerlistGameday.objects.all()
        assert all_playerlist_gamedays.count() == 1
