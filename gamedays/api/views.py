import json
from collections import OrderedDict

from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer, GameOfficialSerializer
from gamedays.models import Gameday, Gameinfo, GameOfficial
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


class GameOfficialCreateAPIView(CreateAPIView):
    serializer_class = GameOfficialSerializer

    def create(self, request, *args, **kwargs):
        GameOfficial.objects.create(gameinfo_id=request.data.get("gameinfo_id"), name=request.data.get("name"), position=request.data.get("position"))
        return Response(status=201)


class GamedayScheduleView(APIView):

    def get(self, request: Request, *args, **kwargs):
        gs = GamedayService.create(kwargs['pk'])
        get = request.query_params.get('get')
        response = '{"error": "Please use parameter - get "}'
        if get == 'schedule':
            response = gs.get_schedule(api=True).to_json(orient='index')
        elif get == 'qualify':
            response = gs.get_qualify_table().to_json(orient='split')
        elif get == 'final':
            response = gs.get_final_table().to_json(orient='split')
        print(json.dumps(json.loads(response), indent=2))
        return Response(json.loads(response, object_pairs_hook=OrderedDict))
