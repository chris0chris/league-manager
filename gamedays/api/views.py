import json
from collections import OrderedDict
from datetime import datetime

from django.conf import settings
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer
from gamedays.models import Gameday, Gameinfo
from gamedays.service.gameday_service import GamedayServiceDeprecated


class GamedayListAPIView(ListAPIView):
    serializer_class = GamedaySerializer

    def get_queryset(self):
        if settings.DEBUG:
            return Gameday.objects.filter(date=settings.DEBUG_DATE)
        return Gameday.objects.filter(date=datetime.today())


class GameinfoUpdateAPIView(RetrieveUpdateAPIView):
    serializer_class = GameinfoSerializer
    queryset = Gameinfo.objects.all()


class GamedayRetrieveUpdate(RetrieveUpdateAPIView):
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.all()


class GamedayScheduleView(APIView):

    # noinspection PyMethodMayBeStatic
    def get(self, request: Request, *args, **kwargs):
        gs = GamedayServiceDeprecated.create(kwargs['pk'])
        get = request.query_params.get('get')
        response = '{"error": "Please use parameter - get "}'
        orient = request.query_params.get('orient')
        orient = 'index' if orient is None else orient
        if get == 'schedule':
            response = gs.get_schedule().to_json(orient=orient)
        elif get == 'qualify':
            response = gs.get_qualify_table().to_json(orient='split')
        elif get == 'final':
            response = gs.get_final_table().to_json(orient='split')
        print(json.dumps(json.loads(response), indent=2))
        return Response(json.loads(response, object_pairs_hook=OrderedDict))


class GamedayCreateView(CreateAPIView):
    serializer_class = GamedaySerializer
