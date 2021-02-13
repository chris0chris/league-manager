import json
from collections import OrderedDict
from http import HTTPStatus

from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView, ListCreateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer, GameOfficialSerializer, GameSetupSerializer
from gamedays.models import Gameday, Gameinfo, GameOfficial
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


class GamedayCreateView(CreateAPIView):
    serializer_class = GamedaySerializer


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


class GameSetupCreateView(CreateAPIView):
    serializer_class = GameSetupSerializer


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
    def put(self, request):
        data = request.data
        game_service = GameService(data.get('gameId'))
        game_service.update_halfetime(data.get('homeScore'), data.get('awayScore'))
        return Response()
