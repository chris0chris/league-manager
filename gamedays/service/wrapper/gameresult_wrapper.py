from gamedays.models import Gameresult, Team, Gameinfo


class GameresultWrapper(object):
    def __init__(self, gameinfo):
        self.gameinfo = gameinfo

    def save_home_first_half(self, first_half, points_against):
        self._save(first_half, None, points_against, True)

    def save_away_first_half(self, first_half, points_against):
        self._save(first_half, None, points_against, False)

    def save_home_second_half(self, second_half, points_against):
        self._save(None, second_half, points_against, True)

    def save_away_second_half(self, second_half, points_against):
        self._save(None, second_half, points_against, False)

    def _save(self, first_half, second_half, points_against, is_home):
        gameresult = self._get_gameresult(is_home)
        if first_half is not None:
            gameresult.fh = first_half
        if second_half is None:
            gameresult.pa = points_against
        else:
            gameresult.sh = second_half
            gameresult.pa = gameresult.pa + points_against
        gameresult.save()

    def _get_team_name(self, is_home):
        return self._get_gameresult(is_home).team.name

    def _get_team_fullname(self, is_home):
        return self._get_gameresult(is_home).team.description

    def _get_gameresult(self, is_home) -> Gameresult:
        return Gameresult.objects.get(gameinfo=self.gameinfo, isHome=is_home)

    def get_home_name(self):
        return self._get_team_name(is_home=True)

    def get_away_name(self):
        return self._get_team_name(is_home=False)

    def get_home_score(self):
        gameresult = self._get_gameresult(is_home=True)
        return self._calc_score(gameresult)

    def get_away_score(self):
        gameresult = self._get_gameresult(is_home=False)
        return self._calc_score(gameresult)

    def _calc_score(self, gameresult):
        score = 0
        if gameresult.fh is not None:
            score = score + gameresult.fh
        if gameresult.sh is not None:
            score = score + gameresult.sh
        return score

    def get_home_fullname(self):
        return self._get_team_fullname(is_home=True)

    def get_away_fullname(self):
        return self._get_team_fullname(is_home=False)

    def create(self, team: Team, fh: int, sh: int, pa: int, is_home=False) -> tuple[Gameresult, bool]:
        return Gameresult.objects.update_or_create(
            gameinfo=self.gameinfo,
            isHome=is_home,
            defaults={
                'gameinfo': self.gameinfo,
                'team': team,
                'isHome': is_home,
                'fh': fh,
                'sh': sh,
                'pa': pa,
            }
        )
