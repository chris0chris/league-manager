import json
from collections import OrderedDict

from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer
from gamedays.models import Gameday, Gameinfo
from gamedays.service.model_wrapper import GamedayModelWrapper


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


class GamedayScheduleView(APIView):

    def get(self, request, *args, **kwargs):
        gmw = GamedayModelWrapper(kwargs['pk'])
        schedule_json = gmw.get_schedule().to_json(orient='split')
        return Response(json.loads(schedule_json, object_pairs_hook=OrderedDict))
