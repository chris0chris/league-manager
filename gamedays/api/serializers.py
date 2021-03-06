from rest_framework.serializers import ModelSerializer

from teammanager.models import Gameday, Gameinfo, GameOfficial, GameSetup


class GamedaySerializer(ModelSerializer):
    class Meta:
        model = Gameday
        fields = '__all__'
        read_only_fields = ['author']
        extra_kwargs = {'start': {'format': '%H:%M'}}


class GameOfficialSerializer(ModelSerializer):
    class Meta:
        model = GameOfficial
        exclude = ('gameinfo',)


class GameinfoSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = ['status', 'gameStarted', 'gameHalftime', 'gameFinished']
        extra_kwargs = {'gameStarted': {'format': '%H:%M'},
                        'gameHalftime': {'format': '%H:%M'},
                        'gameFinished': {'format': '%H:%M'}
                        }


class GameSetupSerializer(ModelSerializer):
    class Meta:
        model = GameSetup
        fields = ['ctResult', 'direction', 'fhPossession']


class GameFinalizer(ModelSerializer):
    class Meta:
        model = GameSetup
        fields = ['homeCaptain', 'awayCaptain', 'hasFinalScoreChanged']
