from gamedays.models import Team, Gameinfo
from knox.models import AuthToken

from passcheck.api.serializers import PasscheckGamesListSerializer


class PasscheckService:
    def get_auth_id(self, token_key):
        if token_key:
            return AuthToken.objects.filter(token_key=token_key).first().user_id

    def get_team_username(self, token_key):
        if token_key:
            auth_id = self.get_auth_id(token_key)
            if auth_id:
                return AuthToken.objects.get(user__pk=auth_id).user.username


    def get_team_Name(self, team_username):
        if team_username:
            return Team.objects.filter(name=team_username).first().description

    def get_officials_id(self, teamname):
        if teamname:
            return Team.objects.filter(name=teamname).first().pk

    def get_officiating_games(self, date, officials_id):
        if officials_id:
            if date is None:
                return PasscheckGamesListSerializer(Gameinfo.objects.filter(officials_id=officials_id), many=True).data

    def get_passcheck_data(self, token):
        return {
            'teamName': self.get_team_Name(team_username=self.get_team_username(token_key=token)),
            'games': self.get_officiating_games(date=None, officials_id=self.get_officials_id(teamname=self.get_team_username(token_key=token)))
        }
