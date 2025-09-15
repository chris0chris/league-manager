import json
from collections import OrderedDict
from datetime import datetime
from http import HTTPStatus

from django.conf import settings
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer, GameOfficialSerializer
from gamedays.models import Gameday, Gameinfo, GameOfficial
from gamedays.service.gameday_service import GamedayService


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
            raise NotFound(detail=f'No officials found for gameId {game_id}')

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


class GamedayScheduleView(APIView):

    # noinspection PyMethodMayBeStatic
    def get(self, request: Request, *args, **kwargs):
        gs = GamedayService.create(kwargs['pk'])
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
        return Response(json.loads(response, object_pairs_hook=OrderedDict))


class GamedayCreateView(CreateAPIView):
    serializer_class = GamedaySerializer
