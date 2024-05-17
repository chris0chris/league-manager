from http import HTTPStatus

from rest_framework.response import Response
from rest_framework.views import APIView

from league_manager.utils.decorators import get_user_request_permission
from scorecard.service.scorecard_service import ScorecardGamedayService


class GamesToWhistleAPIView(APIView):
    @get_user_request_permission
    def get(self, request, *args, **kwargs):
        user_permission = kwargs.get('user_permission')
        gameday_id = kwargs.get('pk')
        team_id = request.user.username
        scorecard_gameday_service = ScorecardGamedayService(gameday_id, user_permission)
        load_all_games = False if request.GET.get('loadAllGames', None) is None else True
        try:
            return Response(scorecard_gameday_service.get_officiating_games(team_id, load_all_games), status=HTTPStatus.OK)
        except PermissionError:
            return Response(status=HTTPStatus.FORBIDDEN)
