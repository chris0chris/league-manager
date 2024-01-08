from datetime import datetime
from urllib.parse import unquote

from gamedays.models import Team, Gameinfo
from knox.models import AuthToken

from passcheck.api.serializers import PasscheckGamesListSerializer, PasscheckSerializer
from passcheck.models import Playerlist


class PasscheckService:
    def get_auth_id(self, token_key):
        if token_key:
            return AuthToken.objects.filter(token_key=token_key).first().user_id

    def get_team_username(self, token_key):
        if token_key:
            auth_id = self.get_auth_id(token_key)
            if auth_id:
                return AuthToken.objects.get(user__pk=auth_id).user.username

    def get_team_name(self, team_username):
        if team_username:
            return Team.objects.filter(name=team_username).first().description

    def get_officials(self, teamname):
        if teamname:
            return Team.objects.get(name=teamname)

    def get_officiating_games(self, officials_id):
        if officials_id:
            date = datetime.today()
            date = '2023-10-31'
            return PasscheckGamesListSerializer(Gameinfo.objects.filter(officials_id=officials_id, gameday__date=date), many=True).data

    def get_passcheck_data(self, token):
        return {
            'officialsTeamName': self.get_team_name(team_username=self.get_team_username(token_key=token)),
            'games': self.get_officiating_games(officials_id=self.get_officials(teamname=self.get_team_username(token_key=token))),
        }


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
