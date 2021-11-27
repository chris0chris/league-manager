import json
from collections import OrderedDict
from http import HTTPStatus

from rest_framework.exceptions import NotFound
from rest_framework.generics import UpdateAPIView, RetrieveUpdateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import GameFinalizer, GameSetupSerializer
from gamedays.service.game_service import GameService
from gamedays.service.gameday_service import GamedayService
from teammanager.models import Gameinfo, Team, GameSetup


class GameLogAPIView(APIView):

    def get(self, request: Request, *args, **kwargs):
        gameId = kwargs.get('id')
        try:
            gamelog = GameService(gameId).get_gamelog()
            return Response(json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict))
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f'No game found for gameId {gameId}')

    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            game_service = GameService(data.get('gameId'))
            gamelog = game_service.create_gamelog(data.get('team'), data.get('event'), request.user, data.get('half'))
            game_service.update_score(gamelog)
            return Response(json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict), status=HTTPStatus.CREATED)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f'Could not create team logs ... gameId {request.data.get("gameId")} not found')
        except Team.DoesNotExist:
            raise NotFound(detail=f'Could not create team logs ... team {request.data.get("team")} not found')

    def delete(self, request: Request, *args, **kwargs):
        game_id = kwargs.get('id')
        try:
            game_service = GameService(game_id)
            gamelog = game_service.delete_gamelog(request.data.get('sequence'))
            game_service.update_score(gamelog)
            return Response(json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict), status=HTTPStatus.OK)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f'Could not delete team logs ... gameId {game_id} not found')


class GameHalftimeAPIView(APIView):
    def put(self, request, *args, **kwargs):
        game_service = GameService(kwargs.get('pk'))
        game_service.update_halftime()
        return Response()


class GameFinalizeUpdateView(UpdateAPIView):
    serializer_class = GameFinalizer
    queryset = GameSetup.objects.all()

    def update(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        game_service = GameService(pk)
        game_service.update_game_finished()
        game_setup, _ = GameSetup.objects.get_or_create(gameinfo_id=pk)
        serializer = GameFinalizer(instance=game_setup, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=HTTPStatus.OK)
        else:
            return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class GameSetupCreateOrUpdateView(RetrieveUpdateAPIView):
    serializer_class = GameSetupSerializer
    queryset = GameSetup.objects.all()

    def get(self, request, *args, **kwargs):
        game_id = kwargs.get('pk')
        try:
            game_setup = GameSetup.objects.get(gameinfo_id=game_id)
            serializer = GameSetupSerializer(game_setup)
            return Response(serializer.data, status=HTTPStatus.OK)
        except GameSetup.DoesNotExist:
            return Response(data={}, status=HTTPStatus.OK)

    def update(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        game_setup, is_game_setup_created = GameSetup.objects.get_or_create(gameinfo_id=pk)
        serializer = GameSetupSerializer(instance=game_setup, data=request.data)
        if is_game_setup_created:
            game_service = GameService(pk)
            game_service.update_gamestart()
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=HTTPStatus.OK)
        else:
            return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class GamesToWhistleAPIView(APIView):
    def get(self, request, *args, **kwargs):
        gs = GamedayService.create(kwargs['pk'])
        games_to_whistle = gs.get_games_to_whistle(kwargs.get('team'))
        games_to_whistle = games_to_whistle.to_json(orient='records')
        print(json.dumps(json.loads(games_to_whistle), indent=2))
        return Response(json.loads(games_to_whistle, object_pairs_hook=OrderedDict))


class GamePossessionAPIView(APIView):
    def put(self, request, *args, **kwargs):
        game_service = GameService(kwargs.get('pk'))
        game_service.update_team_in_possesion(request.data.get('team'))
        return Response()


class ConfigPenalties(APIView):
    def get(self, request, *args, **kwargs):
        penalty_list = [
            {'name': 'illegal contact defense', 'subtext': 'BS/1st 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'flag guarding', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'false start', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'shielding offense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal contact offense', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': False},
            {'name': 'shielding defense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'pass interference defense', 'subtext': 'BS/1st 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'game interference defense', 'subtext': 'BS/1st 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'delay of pass', 'subtext': 'SL/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal hand off', 'subtext': 'SF/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal backward pass', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal touching', 'subtext': 'SL/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal forward pass', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'pass interference offense', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': False},
            {'name': 'game interference offense', 'subtext': 'BS/LoD 10',
             'isPenaltyAgainstOpponent': False},
            {'name': 'jumping', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'diving', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal kick by runner', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal snap', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'delay of game offense', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'delay of game defense', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'encroachment', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal shift', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal motion', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal run', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal run play', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'offside defense', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'disconcerting signals', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegal blitzer signal', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegal blitz', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegal flag pull', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegal kicking a pass defense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegal kicking a pass offense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'side line interference offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'side line interference defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegal participation offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal participation defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegal substitution offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegal substitution defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'unsportsmanlike acts offense', 'subtext': 'DB/10 Notiz', 'isPenaltyAgainstOpponent': False},
            {'name': 'unsportsmanlike acts defense', 'subtext': 'DB/10 Notiz', 'isPenaltyAgainstOpponent': True},
        ]
        return Response(penalty_list)