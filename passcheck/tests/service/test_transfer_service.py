from datetime import datetime

from django.contrib.auth.models import User
from django.test import TestCase

from gamedays.tests.setup_factories.db_setup import DBSetup
from passcheck.models import Playerlist, PlayerlistTransfer
from passcheck.service.transfer_service import TransferService
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck


class TestTransferService(TestCase):
    def test_initialize_transfer(self):
        _, female, _, _ = DbSetupPasscheck.create_playerlist_for_team()
        transferred_team = DBSetup().create_teams(name="Transferred_Team", number_teams=1)[0]
        user = User.objects.first()
        transfer_service = TransferService(female, transferred_team, user=user)
        transfer_service.handle_transfer('pending')
        transferred_playerlist = PlayerlistTransfer.objects.all()
        assert transferred_playerlist.count() == 1
        player_to_transfer: PlayerlistTransfer = transferred_playerlist.last()
        assert player_to_transfer.current_team == female
        assert player_to_transfer.new_team == transferred_team
        assert player_to_transfer.status == 'pending'
        assert player_to_transfer.approved_by is None
        assert player_to_transfer.approval_date is None

    def test_approve_transfer(self):
        _, female, _, _ = DbSetupPasscheck.create_playerlist_for_team()
        transferred_team = DBSetup().create_teams(name="Transferred_Team", number_teams=1)[0]
        user = User.objects.first()
        PlayerlistTransfer.objects.create(
            current_team=female,
            new_team=transferred_team,
        )
        transfer_service = TransferService(female, transferred_team, user=user)
        transfer_service.handle_transfer('approved')
        player_to_transfer = PlayerlistTransfer.objects.first()
        assert player_to_transfer.current_team == female
        assert player_to_transfer.new_team == transferred_team
        assert player_to_transfer.status == 'approved'
        today = datetime.today().date()
        assert player_to_transfer.approval_date.date() == today
        assert Playerlist.objects.get(pk=female.pk).left_on == today
        transferred_team_playerlist = Playerlist.objects.filter(team=transferred_team)
        assert transferred_team_playerlist.count() == 1
        transferred_player = transferred_team_playerlist.first()
        assert transferred_player.player == female.player
        assert transferred_player.jersey_number is None
        assert transferred_player.joined_on == today

    def test_reject_transfer(self):
        _, female, _, _ = DbSetupPasscheck.create_playerlist_for_team()
        transferred_team = DBSetup().create_teams(name="Transferred_Team", number_teams=1)[0]
        user = User.objects.first()
        PlayerlistTransfer.objects.create(
            current_team=female,
            new_team=transferred_team,
        )
        transfer_service = TransferService(female, transferred_team, user=user)
        transfer_service.handle_transfer('rejected')
        player_to_transfer = PlayerlistTransfer.objects.first()
        assert player_to_transfer.current_team == female
        assert player_to_transfer.new_team == transferred_team
        assert player_to_transfer.status == 'rejected'
        today = datetime.today().date()
        assert player_to_transfer.approval_date.date() == today
        assert Playerlist.objects.get(pk=female.pk).left_on is None
        transferred_team_playerlist = Playerlist.objects.filter(team=transferred_team)
        assert transferred_team_playerlist.exists() is False
