from datetime import datetime
from urllib.parse import unquote

from django.db.models import Count, Q

from gamedays.models import Team, Gameinfo, Gameday, SeasonLeagueTeam
from gamedays.service.model_helper import GameresultHelper
from passcheck.api.serializers import PasscheckGamesListSerializer, PasscheckSerializer, RosterSerializer, \
    RosterValidationSerializer
from passcheck.models import Playerlist, EligibilityRule
from passcheck.service.eligibility_validation import EligibilityValidator


class PasscheckService:
    def __init__(self, is_staff=False):
        self.is_staff = is_staff

    def get_officiating_games(self, officials_team):
        date = datetime.today()
        date = '2023-08-05'
        if officials_team is None and self.is_staff:
            gameinfo = Gameinfo.objects.filter(gameday__date=date)
        else:
            gameinfo = Gameinfo.objects.filter(officials_id=officials_team, gameday__date=date)
        gameinfo = gameinfo.annotate(
            home_id=GameresultHelper.get_gameresult_team_subquery(is_home=True, team_column='id'),
            home=GameresultHelper.get_gameresult_team_subquery(is_home=True, team_column='description'),
            away_id=GameresultHelper.get_gameresult_team_subquery(is_home=False, team_column='id'),
            away=GameresultHelper.get_gameresult_team_subquery(is_home=False, team_column='description'),
        )
        return PasscheckGamesListSerializer(
            gameinfo.values(*PasscheckGamesListSerializer.ALL_FIELD_VALUES),
            many=True
        ).data

    def get_passcheck_data(self, team_id):
        team = self._get_team(team_id)
        return {
            'officialsTeamName': team.description if team else team_id,
            'games': self.get_officiating_games(officials_team=team),
        }

    def _get_team(self, team_id):
        try:
            if type(team_id) is str:
                team = Team.objects.get(name=team_id)
            else:
                team = Team.objects.get(pk=team_id)
            return team
        except Team.DoesNotExist:
            return None

    def get_roster(self, team: Team):
        all_leagues = Playerlist.objects.filter(team=team).exclude(gamedays__league__name=None).distinct().values(
            'gamedays__league', 'gamedays__league__name')
        league_annotations = {
            f'{league["gamedays__league"]}': Count('gamedays__league',
                                                   filter=Q(gamedays__league=league['gamedays__league'])) for
            league in all_leagues}
        roster = Playerlist.objects.filter(team=team).annotate(**league_annotations).values()
        return {
            'all_leagues': list(all_leagues),
            'roster': RosterSerializer(instance=roster, is_staff=self.is_staff,
                                       context={'all_leagues': list(all_leagues)}, many=True).data
        }

    def get_roster_with_validation(self, team: Team, gameday: Gameday):
        team = 23
        seasonLeague: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=23)
        gameday: Gameday = Gameday.objects.get(pk=147)
        rule = EligibilityRule.objects.get(league=seasonLeague.league, eligible_in=gameday.league)
        gameday_league_annotation = {
            f'{gameday.league_id}': Count('gamedays__league',
                                          filter=Q(gamedays__league=gameday.league))}
        roster_second_team = Playerlist.objects.filter(team=team).annotate(**gameday_league_annotation).values()
        roster = self.get_roster(team)
        ev = EligibilityValidator(rule, gameday)
        roster.update({
            'additionalRosters': RosterValidationSerializer(instance=roster_second_team, is_staff=self.is_staff,
                                                            context={'validator': ev, 'all_leagues': [
                                                                {'gamedays__league': gameday.league_id}]
                                                                     },
                                                            many=True).data
        })
        return roster


class PasscheckServicePlayers:
    def get_players(self, team):
        return PasscheckSerializer(Playerlist.objects.filter(team__description=team), many=True).data

    def get_playerlist_data(self, team):
        description = unquote(team)
        return {
            'players': self.get_players(team=description),
            'otherPlayers': self.get_players(team=description),
            # 'otherPlayers': self.get_other_players(team=team),
        }

    def create_roster(self, team, data):
        gameday = data.get('gameday')
        roster = data.get('roster')
        for player in Playerlist.objects.filter(team__description=team, gamedays__id=gameday):
            player.gamedays.clear()
        for player in Playerlist.objects.filter(id__in=roster):
            player.gamedays.add(gameday)
