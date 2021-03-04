from gamedays.service.gamelog import GameLog, GameLogCreator
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper
from teammanager.models import Team


class GameService(object):
    def __init__(self, game_id):
        self.gameinfo: GameinfoWrapper = GameinfoWrapper(game_id)
        self.gameresult: GameresultWrapper = GameresultWrapper(self.gameinfo.gameinfo)

    def update_halftime(self):
        self.gameinfo.set_halftime_to_now()

    def update_gamestart(self):
        self.gameinfo.set_gamestarted_to_now()

    def update_game_finished(self):
        self.gameinfo.set_game_finished_to_now()

    def get_gamelog(self):
        return GameLog(self.gameinfo.gameinfo)

    def create_gamelog(self, team_name, event, half):
        # ToDo extract to TeamWrapper
        team = Team.objects.get(name=team_name)
        gamelog = GameLogCreator(self.gameinfo.gameinfo, team, event, half)
        return gamelog.create()

    def update_score(self, gamelog: GameLog):
        self.gameresult.save_home_first_half(gamelog.get_home_firsthalf_score(), gamelog.get_away_firsthalf_score())
        self.gameresult.save_away_first_half(gamelog.get_away_firsthalf_score(), gamelog.get_home_firsthalf_score())
        self.gameresult.save_home_second_half(gamelog.get_home_secondhalf_score(), gamelog.get_away_secondhalf_score())
        self.gameresult.save_away_second_half(gamelog.get_away_secondhalf_score(), gamelog.get_home_secondhalf_score())

    def delete_gamelog(self, sequence):
        gamelog = GameLog(self.gameinfo.gameinfo)
        gamelog.mark_entries_as_deleted(sequence)
        return gamelog
