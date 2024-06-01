from rest_framework.fields import SerializerMethodField, TimeField, IntegerField, CharField, DateField
from rest_framework.serializers import Serializer, ModelSerializer

from gamedays.models import GameOfficial


class ScorecardGameinfoSerializer(Serializer):
    ID_C = 'id'
    FIELD_C = 'field'
    SCHEDULED_C = 'scheduled'
    GAME_FINISHED_C = 'gameFinished'
    OFFICIALS_ID_C = 'officials_id'
    OFFICIALS_DESC_C = 'officials__description'
    HOME_C = 'home'
    AWAY_C = 'away'

    ALL_FIELD_VALUES = [ID_C, FIELD_C, SCHEDULED_C, OFFICIALS_ID_C, OFFICIALS_DESC_C, HOME_C, AWAY_C, GAME_FINISHED_C]

    id = IntegerField()
    field = IntegerField()
    scheduled = TimeField(format='%H:%M')
    isFinished = SerializerMethodField()
    officialsId = IntegerField(source=OFFICIALS_ID_C)
    officials = CharField(source=OFFICIALS_DESC_C)
    home = CharField()
    away = CharField()

    def get_isFinished(self, obj: dict) -> bool:
        return obj.get(self.GAME_FINISHED_C) is not None


class ScorecardGamedaySerializer(Serializer):
    DATE_C = 'date'
    NAME_C = 'name'
    GAMES_C = 'games'
    ID_C = 'id'

    ALL_FIELD_VALUES = [ID_C, DATE_C, NAME_C]

    id = IntegerField()
    date = DateField(format='%d.%m.%Y')
    name = CharField()
    games = ScorecardGameinfoSerializer(many=True)


class GameOfficialSerializer(ModelSerializer):
    class Meta:
        model = GameOfficial
        exclude = ('gameinfo',)
