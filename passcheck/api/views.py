from http import HTTPStatus

from rest_framework.response import Response
from rest_framework.views import APIView

from league_manager.utils.decorators import is_staff
from passcheck.service.passcheck_service import PasscheckService, PasscheckServicePlayers


class PasscheckGamesAPIView(APIView):

    @is_staff
    def get(self, request, *args, **kwargs):
        is_staff = kwargs.get('is_staff')
        team_id = kwargs.get('team', request.user.username)
        passcheck = PasscheckService(is_staff=is_staff)
        return Response(passcheck.get_passcheck_data(team_id=team_id), status=HTTPStatus.OK)


class PasscheckRosterAPIView(APIView):
    @is_staff
    def get(self, request, **kwargs):
        team = kwargs.get('team')
        gameday_id = kwargs.get('gameday')
        is_staff = kwargs.get('is_staff')
        if team:
            passcheck = PasscheckService(is_staff)
            return Response(passcheck.get_roster_with_validation(team, gameday_id), status=HTTPStatus.OK)

    def put(self, request, **kwargs):
        data = request.data
        team_id = kwargs.get('team')
        gameday_id = kwargs.get('gameday')
        passcheckservice = PasscheckServicePlayers()
        passcheckservice.create_roster_and_passcheck_verification(team_id, gameday_id, request.user, data)
        return Response(status=HTTPStatus.OK)
