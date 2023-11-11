from rest_framework.generics import ListAPIView

from passcheck.api.serializers import PasscheckSerializer
from passcheck.models import Playerlist


class PasscheckListAPIView(ListAPIView):
    serializer_class = PasscheckSerializer

    def get_queryset(self):
        return Playerlist.objects.all()
