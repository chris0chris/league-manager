from datetime import datetime

from gamedays.models import Team, League, Season
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import TeamFactory, LeagueFactory, SeasonFactory, GamedayFactory, \
    SeasonLeagueTeamFactory
from passcheck.models import Playerlist
from passcheck.tests.setup_factories.factories_passcheck import PlayerlistFactory, EligibilityRuleFactory


class DbSetupPasscheck:
    @staticmethod
    def create_playerlist_for_team() -> tuple[League, Season, Team]:
        prime_league, second_league, third_league, season, team = DbSetupPasscheck.create_eligibility_rules()
        DBSetup().create_new_user(team.name)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        third_league_gameday = GamedayFactory(season=season, league=third_league)
        EligibilityRuleFactory(league=second_league, eligible_in=[prime_league], max_gamedays=3,
                               is_relegation_allowed=True)
        EligibilityRuleFactory(league=second_league, eligible_in=[third_league], max_gamedays=2, max_players=2, )
        today = datetime.today()
        PlayerlistFactory(team=team, first_name='Fia', last_name='Female', jersey_number=7, pass_number=7777777,
                          sex=Playerlist.FEMALE, year_of_birth=1982, gamedays=[prime_gameday, third_league_gameday])
        PlayerlistFactory(team=team, first_name='Yonathan', last_name='Young', jersey_number=1, pass_number=123,
                          sex=Playerlist.MALE, year_of_birth=today.year - 18,
                          gamedays=[prime_gameday, third_league_gameday])
        PlayerlistFactory(team=team, first_name='Oscar', last_name='Old', jersey_number=99, pass_number=9999999,
                          sex=Playerlist.MALE, year_of_birth=1900, gamedays=[prime_gameday, third_league_gameday])
        return prime_league, season, team

    @staticmethod
    def create_eligibility_rules() -> tuple[League, League, League, Season, Team]:
        second_league = LeagueFactory(name='Second League')
        prime_league = LeagueFactory(name='Prime League')
        third_league = LeagueFactory(name='Third League')
        season = SeasonFactory(name='Season 1')
        team = TeamFactory(name='Some team')
        SeasonLeagueTeamFactory(season=season, league=second_league, team=team)
        EligibilityRuleFactory(league=second_league, eligible_in=[prime_league], max_gamedays=3,
                               is_relegation_allowed=True)
        EligibilityRuleFactory(league=second_league, eligible_in=[third_league], max_gamedays=2, max_players=2, )
        return prime_league, second_league, third_league, season, team
