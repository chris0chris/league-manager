from datetime import datetime

from django.db.models import Subquery, OuterRef

from gamedays.models import Gameinfo, Gameresult


class GameinfoWrapper(object):
    def __init__(self, game_id: int):
        try:
            self.gameinfo = Gameinfo.objects.get(id=game_id)
        except Gameinfo.DoesNotExist:
            raise ValueError(f'No entry found for game_id: {game_id}')

    def set_halftime_to_now(self):
        self.gameinfo.status = '2. Halbzeit'
        self.gameinfo.gameHalftime = datetime.now()
        self.gameinfo.save()

    def set_gamestarted_to_now(self):
        self.gameinfo.status = '1. Halbzeit'
        self.gameinfo.gameStarted = datetime.now()
        self.gameinfo.save()

    def set_game_finished_to_now(self):
        self.gameinfo.status = 'beendet'
        self.gameinfo.gameFinished = datetime.now()
        self.gameinfo.save()

    def update_team_in_possession(self, team_name):
        self.gameinfo.in_possession = team_name
        self.gameinfo.save()

    def get_game_info_with_home_and_away(self):
        return Gameinfo.objects.filter(id=self.gameinfo.pk).distinct().annotate(
            home=self._get_gameresult_team_subquery(is_home=True, team_column='team__description'),
            away=self._get_gameresult_team_subquery(is_home=False, team_column='team__description'),
        )

    # noinspection PyMethodMayBeStatic
    def _get_gameresult_team_subquery(self, is_home: bool, team_column: str):
        return Subquery(
            Gameresult.objects.filter(
                gameinfo=OuterRef('id'),
                isHome=is_home
            ).values(team_column)[:1]
        )
