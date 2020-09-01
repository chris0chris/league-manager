from rest_framework.serializers import ModelSerializer

from gamedays.models import Gameday


class GamedaySerializer(ModelSerializer):
    class Meta:
        model = Gameday
        exclude = ['author']
