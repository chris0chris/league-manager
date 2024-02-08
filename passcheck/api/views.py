from http import HTTPStatus

from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from league_manager.utils.decorators import get_user_request_permission
from passcheck.service.passcheck_service import PasscheckService, PasscheckServicePlayers, PasscheckException


class PasscheckGamesAPIView(APIView):

    @get_user_request_permission
    def get(self, request, *args, **kwargs):
        user_permission = kwargs.get('user_permission')
        team_id = kwargs.get('team', request.user.username)
        passcheck = PasscheckService(user_permission=user_permission)
        return Response(passcheck.get_passcheck_data(team_id=team_id), status=HTTPStatus.OK)


class PasscheckRosterAPIView(APIView):
    @get_user_request_permission
    def get(self, request, **kwargs):
        team = kwargs.get('team')
        gameday_id = kwargs.get('gameday')
        user_permission = kwargs.get('user_permission')
        if team:
            passcheck = PasscheckService(user_permission)
            try:
                return Response(passcheck.get_roster_with_validation(team, gameday_id), status=HTTPStatus.OK)
            except PasscheckException as exception:
                raise PermissionDenied(detail=str(exception))

    def put(self, request, **kwargs):
        data = request.data
        team_id = kwargs.get('team')
        gameday_id = kwargs.get('gameday')
        passcheckservice = PasscheckServicePlayers()
        passcheckservice.create_roster_and_passcheck_verification(team_id, gameday_id, request.user, data)
        return Response(status=HTTPStatus.OK)
