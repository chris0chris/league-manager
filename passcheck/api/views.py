from rest_framework.response import Response
# importing framework views
from rest_framework.generics import ListAPIView

# importing serializers
from passcheck.api.serializers import PasscheckSerializer, PasscheckGameinfoSerializer
from gamedays.api.serializers import GamedaySerializer

# importing models
from passcheck.models import Playerlist
from gamedays.models import Gameinfo


# declaring Views as APIViews from rest framework
class PasscheckListAPIView(ListAPIView):
    serializer_class = PasscheckSerializer

    # defining what objects will be returned by API from which model
    def get_queryset(self):
        return Playerlist.objects.all()


class PasscheckGameinfoAPIView(ListAPIView):
    serializer_class = PasscheckGameinfoSerializer

    def get_queryset(self, request, *args, **kwargs):
        games = Gameinfo.objects.get()

