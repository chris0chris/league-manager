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
            {'name': 'illegaler Kontakt Defense', 'subtext': 'BS/aFD 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'Flag Guarding', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Fehlstart', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Abschirmen (Blocken) Offense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Kontakt Offense', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': False},
            {'name': 'Abschirmen (Blocken) Defense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'Defense Passbehinderung', 'subtext': 'BS/aFD 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'Behinderung Spieldurchführung Defense', 'subtext': 'BS/aFD 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'Passverzögerung', 'subtext': 'SL/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegale Ballübergabe', 'subtext': 'SF/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Rückwärtspass', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegales Touching', 'subtext': 'SL/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Vorwärtspass', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Offense Passbehinderung', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': False},
            {'name': 'Behinderung Spieldurchführung Offense', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': False},
            {'name': 'Springen', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Hechten', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegales Kicken des Balls durch Runner', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Snap', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Spielverzögerung Offense', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Spielverzögerung Defense', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'Encroachment', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Shift', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegale Motion', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Lauf', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Laufspielzug', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Defense Offside', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'Störende Signale', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegales Blitzersignal', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegaler Blitz', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegales Flaggenziehen', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegales Treten eines Pass Defense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegales Treten eines Pass Offense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Behinderung an der Seitenlinie Offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Behinderung an der Seitenlinie Defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegale Spielteilnahme Offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegale Spielteilnahme Defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegale Auswechslung Offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegale Auswechslung Defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'Unsportliches Verhalten Offense', 'subtext': 'DB/10 Notiz', 'isPenaltyAgainstOpponent': False},
            {'name': 'Unsportliches Verhalten Defense', 'subtext': 'DB/10 Notiz', 'isPenaltyAgainstOpponent': True},
            {'name': 'Person mit illegaler Ausrüstung verlässt nicht das Feld Offense', 'subtext': 'DB/TO', 'isPenaltyAgainstOpponent': False},
            {'name': 'Person mit illegaler Ausrüstung verlässt nicht das Feld Defense', 'subtext': 'DB/TO', 'isPenaltyAgainstOpponent': True},
            {'name': 'Person mit fehlender vorgeschriebener Ausrüstung verlässt nicht das Feld Offense', 'subtext': 'DB/TO', 'isPenaltyAgainstOpponent': False},
            {'name': 'Person mit fehlender vorgeschriebener Ausrüstung verlässt nicht das Feld Defense', 'subtext': 'DB/TO', 'isPenaltyAgainstOpponent': True},
            {'name': 'Person mit blutender Wunde verlässt nicht das Feld Offense', 'subtext': 'DB/TO', 'isPenaltyAgainstOpponent': False},
            {'name': 'Person mit blutender Wunde verlässt nicht das Feld Defense', 'subtext': 'DB/TO', 'isPenaltyAgainstOpponent': True},
        ]
        return Response(penalty_list)
