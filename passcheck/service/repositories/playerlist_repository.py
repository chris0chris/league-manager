from passcheck.models import Playerlist


class PlayerlistRepository:

    @staticmethod
    def update_left_on(playerlist: Playerlist, today):
        Playerlist.objects.filter(pk=playerlist.pk).update(left_on=today)

    @staticmethod
    def create(team, player, jersey_number, joined_on):
        return Playerlist.objects.create(
                team=team,
                player=player,
                jersey_number=jersey_number,
                joined_on = joined_on,
            )