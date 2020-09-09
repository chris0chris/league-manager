from rest_framework.serializers import ModelSerializer

from gamedays.models import Gameday, Gameinfo


class GamedaySerializer(ModelSerializer):
    class Meta:
        model = Gameday
        fields = '__all__'
        read_only_fields = ['author']


class GameinfoSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = ['status', 'gameStarted', 'gameHalftime', 'gameFinished', 'pin']


class ScheduleSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = '__all__'
