from django.contrib.auth.models import User
from knox.models import AuthToken
from rest_framework.fields import SerializerMethodField, CharField, IntegerField
from rest_framework.serializers import ModelSerializer, Serializer

from gamedays.models import Gameinfo, Team, Gameday
# importing models
from passcheck.models import Playerlist


class RosterSerializer(Serializer):
    first_name = CharField()
    last_name = CharField()
    jersey_number = IntegerField()
    pass_number = IntegerField()
    sex = IntegerField()
    gamedays_counter = SerializerMethodField()

    def get_gamedays_counter(self, obj: dict):
        all_leagues = self.context.get('all_leagues', [])
        gamedays_counters = {}
        for league in all_leagues:
            field_name = f'{league["gamedays__league"]}'
            gamedays_counters[field_name] = obj[field_name]
        return gamedays_counters


class PasscheckSerializer(ModelSerializer):
    ownLeagueGamedaysPlayed = SerializerMethodField('get_own')
    otherTeamGamedaysPlayed = SerializerMethodField('get_other')

    def get_own(self, obj: Playerlist):
        return 0

    def get_other(self, obj: Playerlist):
        return 0

    class Meta:
        model = Playerlist
        fields = '__all__'


class PasscheckGamesListSerializer(ModelSerializer):
    home = SerializerMethodField()
    away = SerializerMethodField()

    def get_home(self, obj: Gameinfo):
        return obj.gameresult_set.get(isHome=True).team.description
    def get_away(self, obj:Gameinfo):
        return obj.gameresult_set.get(isHome=False).team.description

    class Meta:
        model = Gameinfo
        fields = ('id',
                  'field',
                  'scheduled',
                  'officials',
                  'gameday_id',
                  'home',
                  'away')


class PasscheckTeamInfoSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo




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


class PasscheckServiceSerializer:
    class Meta:
        fields = '__all__'
