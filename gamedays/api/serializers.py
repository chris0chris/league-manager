from rest_framework.serializers import ModelSerializer

from gamedays.models import Gameday, Gameinfo, GameOfficial


class GamedaySerializer(ModelSerializer):
    class Meta:
        model = Gameday
        fields = '__all__'
        read_only_fields = ['author']
        extra_kwargs = {'start': {'format': '%H:%M'}}


class GameOfficialSerializer(ModelSerializer):
    class Meta:
        model = GameOfficial
        fields = '__all__'


class GameinfoSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = ['status', 'gameStarted', 'gameHalftime', 'gameFinished', 'pin']
        extra_kwargs = {'gameStarted': {'format': '%H:%M'},
                        'gameHalftime': {'format': '%H:%M'},
                        'gameFinished': {'format': '%H:%M'}
                        }
