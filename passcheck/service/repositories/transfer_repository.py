from django.utils import timezone

from passcheck.models import PlayerlistTransfer


class TransferRepository:
    @staticmethod
    def update(playerlist, new_team, status, user, note=None):
        return PlayerlistTransfer.objects.filter(
            current_team=playerlist.pk, status="pending"
        ).update(
            current_team=playerlist,
            new_team=new_team,
            status=status,
            approved_by=user,
            approval_date=timezone.now(),
            note=note,
        )

    @staticmethod
    def create(current_team, new_team, note=None):
        return PlayerlistTransfer.objects.create(
            current_team=current_team, new_team=new_team, note=note
        )
