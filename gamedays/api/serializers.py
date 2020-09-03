from rest_framework.serializers import ModelSerializer

from gamedays.models import Gameday, Gameinfo


class GamedaySerializer(ModelSerializer):
    class Meta:
        model = Gameday
        exclude = ['author']


class GameinfoSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = ['status', 'gameStarted', 'gameHalftime', 'gameFinished', 'pin']
        # fields = '__all__'
