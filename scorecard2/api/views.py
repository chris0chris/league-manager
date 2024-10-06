from http import HTTPStatus

from rest_framework import permissions
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.models import GameOfficial
from league_manager.utils.decorators import get_user_request_permission
from league_manager.utils.permissions import IsStaffOrTeamParticipatingInGameday
from officials.service.official_service import OfficialService
from scorecard2.api.serializers import GameOfficialSerializer
from scorecard2.service.scorecard_service import ScorecardGamedayService, ScorecardConfigService, ScorecardGameService, \
    ScorecardGameSetupService


class SpecificGamedayAndGamesToOfficiateAPIView(APIView):
    @get_user_request_permission
    def get(self, request, *args, **kwargs):
        user_permission = kwargs.get('user_permission')
        gameday_id = kwargs.get('pk')
        team_id = request.user.username
        scorecard_gameday_service = ScorecardGamedayService(gameday_id, user_permission)
        try:
            return Response(
                scorecard_gameday_service.get_officiating_games(team_id),
                status=HTTPStatus.OK
            )
        except PermissionError as exception:
            raise PermissionDenied(detail=str(exception))


class GamedaysAndGamesToOfficiateAPIView(SpecificGamedayAndGamesToOfficiateAPIView):
    pass


class GameOfficialCreateOrUpdateView(RetrieveUpdateAPIView):
    serializer_class = GameOfficialSerializer
    queryset = GameOfficial.objects.all()

    def get(self, request, *args, **kwargs):
        game_id = kwargs.get('pk')
        try:
            officials = GameOfficial.objects.filter(gameinfo_id=game_id)
            serializer = GameOfficialSerializer(instance=officials, many=True)
            return Response(serializer.data, status=HTTPStatus.OK)
        except GameOfficial.DoesNotExist:
            raise NotFound(detail=f'No official found for gameId {game_id}')

    def update(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        response_data = []
        for item in request.data:
            official, _ = GameOfficial.objects.get_or_create(gameinfo_id=pk, position=item['position'])
            serializer = GameOfficialSerializer(instance=official, data=item)
            if serializer.is_valid():
                serializer.save()
                response_data.append(serializer.data)
            else:
                return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)
        return Response(response_data, status=HTTPStatus.OK)


class GameSetupAPIView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsStaffOrTeamParticipatingInGameday)

    # noinspection PyMethodMayBeStatic
    def get(self, request, **kwargs):
        gameinfo_id = kwargs.get('pk')
        scorecard_config_service = ScorecardConfigService(gameinfo_id)
        official_service = OfficialService()
        gameinfo_service = ScorecardGameService(gameinfo_id)
        try:
            return Response(
                {"scorecard": scorecard_config_service.get_kickoff_config(),
                 "teamOfficials": official_service.get_team_officials_by_gameinfo(gameinfo_id),
                 "gameInfo": gameinfo_service.get_game_info(),
                 },
                status=HTTPStatus.OK
            )
        except PermissionError as exception:
            raise PermissionDenied(detail=str(exception))

    # noinspection PyMethodMayBeStatic
    def put(self, request, *args, **kwargs):
        gameinfo_id = kwargs.get('pk')
        game_setup_service = ScorecardGameSetupService(gameinfo_id)
        try:
            return Response(
                game_setup_service.save_game_setup(request.data, request.user),
                status=HTTPStatus.OK
            )
        except ValueError as error:
            raise ValidationError(detail=str(error))
