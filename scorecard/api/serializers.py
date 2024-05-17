from rest_framework.fields import SerializerMethodField, TimeField, IntegerField, CharField
from rest_framework.serializers import Serializer


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
