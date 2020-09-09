from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView

from gamedays.api.serializers import GamedaySerializer, GameinfoSerializer, ScheduleSerializer
from gamedays.models import Gameday, Gameinfo


class GamedayListAPIView(ListAPIView):
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.all()


class GameinfoUpdateAPIView(RetrieveUpdateAPIView):
    serializer_class = GameinfoSerializer
    queryset = Gameinfo.objects.all()


class GamedayRetrieveUpdate(RetrieveUpdateAPIView):
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.all()


class GamedayScheduleListView(ListAPIView):
    serializer_class = ScheduleSerializer

    def get_queryset(self):
        queryset = Gameinfo.objects.filter(gameday_id=self.kwargs['pk'])
        return queryset


class GamedayCreateView(CreateAPIView):
    serializer_class = GamedaySerializer
