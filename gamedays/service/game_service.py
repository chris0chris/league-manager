from gamedays.service.gamelog import GameLog, GameLogCreator
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper


class GameService(object):
    def __init__(self, game_id):
        self.gameinfo: GameinfoWrapper = GameinfoWrapper(game_id)
        self.gameresult: GameresultWrapper = GameresultWrapper(self.gameinfo.gameinfo)

    def update_halftime(self, home_score, away_score):
        self.gameinfo.set_halftime_to_now()
        self.gameresult.save_home_first_half(home_score, away_score)
        self.gameresult.save_away_first_half(away_score, home_score)

    def get_gamelog(self):
        return GameLog(self.gameinfo.gameinfo)

    def create_gamelog(self, team, event, half):
        gamelog = GameLogCreator(self.gameinfo.gameinfo, team, event, half)
        return gamelog.create()
