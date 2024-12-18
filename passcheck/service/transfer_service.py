from django.contrib.auth.models import User
from django.utils import timezone

from gamedays.models import Team
from passcheck.models import Playerlist
from passcheck.service.repositories.playerlist_repository import PlayerlistRepository
from passcheck.service.repositories.transfer_repository import TransferRepository


class TransferService:
    def __init__(self, playerlist: Playerlist, new_team: Team, user: User, note: str|None):
        self.playerlist = playerlist
        self.new_team = new_team
        self.user = user
        self.note = note

    def initialize_transfer(self):
        return TransferRepository.create(
            current_team=self.playerlist,
            new_team=self.new_team,
        )

    def approve_transfer(self):
        today = timezone.now().date()
        TransferRepository.update(self.playerlist, self.new_team, 'approved', self.user, self.note)
        PlayerlistRepository.update_left_on(self.playerlist, today)
        PlayerlistRepository.create(
            team=self.new_team,
            player=self.playerlist.player,
            jersey_number=None,
            joined_on=today,
        )

    def reject_transfer(self):
        TransferRepository.update(self.playerlist, self.new_team, 'rejected', self.user, self.note)

    def handle_transfer(self, status='pending'):
        if status == 'pending':
            self.initialize_transfer()
        elif status == 'approved':
            self.approve_transfer()
        elif status == 'rejected':
            self.reject_transfer()

