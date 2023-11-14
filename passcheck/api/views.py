# importing framework views
from rest_framework.generics import ListAPIView

# importing serializers
from passcheck.api.serializers import PasscheckSerializer

# importing models
from passcheck.models import Playerlist


# declaring Views as APIViews from rest framework
class PasscheckListAPIView(ListAPIView):
    serializer_class = PasscheckSerializer

    # defining what objects will be returned by API from which model
    def get_queryset(self):
        return Playerlist.objects.all()
