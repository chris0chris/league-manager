from gamedays.models import Season, League
from gamedays.service.gameday_settings import SCHEDULED, OFFICIALS_NAME, STAGE, STANDING, HOME, \
    AWAY, GAMEDAY_NAME, GAMEDAY_ID, \
    GAMEINFO_ID
from league_table.service.ranking.engine import LeagueRankingEngine


class LeagueTable:

    def __init__(self):
        pass

    def get_standing(self, league_slug: str, season_slug: str):
        # TODO config für LeasgueSeasonConfig
        engine = LeagueRankingEngine(
            league=League.objects.get(slug=league_slug),
            season=Season.objects.get(slug=season_slug),
        )
        final_league_table = engine.compute_league_table()
        columns = [
            GAMEDAY_NAME,
            GAMEDAY_ID,
            SCHEDULED,
            OFFICIALS_NAME,
            GAMEINFO_ID,
            HOME,
            AWAY,
            STANDING,
            STAGE,
        ]
        return final_league_table

    def get_all_schedules(self):
        # TODO
        return []
