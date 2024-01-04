from rest_framework.serializers import ModelSerializer

# importing models
from passcheck.models import Playerlist
from gamedays.models import Gameinfo


# Serialize table data into json object
class PasscheckSerializer(ModelSerializer):
    class Meta:
        model = Playerlist
        fields = '__all__'


class PasscheckGameinfoSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = '__all__'
