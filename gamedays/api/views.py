import json
from collections import OrderedDict
from http import HTTPStatus

from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView, ListCreateAPIView, UpdateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer, GameOfficialSerializer, GameSetupSerializer, \
    GameFinalizer
from gamedays.models import Gameday, Gameinfo, GameOfficial, GameSetup
from gamedays.service.game_service import GameService
from gamedays.service.gameday_service import GamedayService


class GamedayListAPIView(ListAPIView):
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.all()


class GameinfoUpdateAPIView(RetrieveUpdateAPIView):
    serializer_class = GameinfoSerializer
    queryset = Gameinfo.objects.all()


class GamedayRetrieveUpdate(RetrieveUpdateAPIView):
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.all()



class GameOfficialListCreateView(ListCreateAPIView):
    serializer_class = GameOfficialSerializer

    def get_queryset(self):
        gameinfo_id = self.request.query_params.get('gameinfo')
        if gameinfo_id:
            return GameOfficial.objects.filter(gameinfo_id=gameinfo_id)
        return GameOfficial.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, many=isinstance(request.data, list))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=HTTPStatus.CREATED)


class GamedayScheduleView(APIView):

    def get(self, request: Request, *args, **kwargs):
        gs = GamedayService.create(kwargs['pk'])
        get = request.query_params.get('get')
        response = '{"error": "Please use parameter - get "}'
        orient = request.query_params.get('orient')
        orient = 'index' if orient is None else orient
        if get == 'schedule':
            response = gs.get_schedule(api=True).to_json(orient=orient)
        elif get == 'qualify':
            response = gs.get_qualify_table().to_json(orient='split')
        elif get == 'final':
            response = gs.get_final_table().to_json(orient='split')
        print(json.dumps(json.loads(response), indent=2))
        return Response(json.loads(response, object_pairs_hook=OrderedDict))


class GamedayCreateView(CreateAPIView):
    serializer_class = GamedaySerializer


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
            gamelog = game_service.create_gamelog(data.get('team'), data.get('event'), data.get('half'))
            return Response(json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict), status=HTTPStatus.CREATED)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f'Could not create team logs ... gameId {request.data.get("gameId")} not found')


class GameHalftimeAPIView(APIView):
    def put(self, request, *args, **kwargs):
        data = request.data
        game_service = GameService(kwargs.get('pk'))
        game_service.update_halftime(data.get('homeScore'), data.get('awayScore'))
        return Response()


class GameFinalizeUpdateView(UpdateAPIView):
    serializer_class = GameFinalizer
    queryset = GameSetup.objects.all()

    def update(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        game_service = GameService(kwargs.get('pk'))
        game_service.update_game_finished()
        game_setup, _ = GameSetup.objects.get_or_create(gameinfo_id=pk)
        serializer = GameFinalizer(instance=game_setup, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=HTTPStatus.OK)
        else:
            return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class GameSetupCreateOrUpdateView(RetrieveUpdateAPIView):
    def get(self, request, *args, **kwargs):
        game_id = kwargs.get('pk')
        try:
            game_setup = GameSetup.objects.get(gameinfo_id=game_id)
            serializer = GameSetupSerializer(game_setup)
            return Response(serializer.data, status=HTTPStatus.OK)
        except GameSetup.DoesNotExist:
            raise NotFound(detail=f'No game found for gameId {game_id}')

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
