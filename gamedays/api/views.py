from rest_framework.generics import ListAPIView

from gamedays.api.serializers import GamedaySerializer
from gamedays.models import Gameday


class GamedayListAPIView(ListAPIView):
    serializer_class = GamedaySerializer
    model = Gameday
    queryset = Gameday.objects.all()
    exclude = ['author']


class GameinfoCreateAPIView(ListAPIView):
    serializer_class = GamedaySerializer
    model = Gameday
    queryset = Gameday.objects.all()
    exclude = ['author']
