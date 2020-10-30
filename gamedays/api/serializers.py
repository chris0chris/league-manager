from rest_framework.serializers import ModelSerializer

from gamedays.models import Gameday, Gameinfo


class GamedaySerializer(ModelSerializer):
    class Meta:
        model = Gameday
        fields = '__all__'
        read_only_fields = ['author']
        extra_kwargs = {'start': {'format': '%H:%M'}}


class GameinfoSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = ['status', 'gameStarted', 'gameHalftime', 'gameFinished', 'pin']
        extra_kwargs = {'gameStarted': {'format': '%H:%M'},
                        'gameHalftime': {'format': '%H:%M'},
                        'gameFinished': {'format': '%H:%M'}
                        }
