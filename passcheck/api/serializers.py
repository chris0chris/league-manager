from rest_framework.serializers import ModelSerializer
from django.contrib.auth.models import User


# importing models
from passcheck.models import Playerlist
from gamedays.models import Gameinfo, Team, Gameday
from knox.models import AuthToken


# Serialize table data into json object
class PasscheckSerializer(ModelSerializer):
    class Meta:
        model = Playerlist
        fields = '__all__'


class PasscheckGamesListSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = ('id',
                  'field',
                  'scheduled',
                  'officials')


class PasscheckOfficialsAuthSerializer(ModelSerializer):
    class Meta:
        model = AuthToken
        fields = ('token_key', 'user_id')


class PasscheckGamedayTeamsSerializer(ModelSerializer):
    class Meta:
        model = Team
        fields = ('id', 'name')


class PasscheckGamedaysListSerializer(ModelSerializer):
    class Meta:
        model = Gameday
        fields = ('id', 'league_id', 'season_id', 'date')


class PasscheckUsernamesSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')