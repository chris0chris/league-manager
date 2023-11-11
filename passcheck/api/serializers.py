from rest_framework.serializers import ModelSerializer
from passcheck.models import Playerlist


class PasscheckSerializer(ModelSerializer):
    class Meta:
        model = Playerlist
        fields = '__all__'