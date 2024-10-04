from rest_framework.fields import SerializerMethodField, TimeField, IntegerField, CharField, DateField
from rest_framework.serializers import Serializer, ModelSerializer

from gamedays.models import GameOfficial
from scorecard2.models import ScorecardOfficial, ScorecardCategory, ScorecardCategoryValue, ScorecardConfig


class ScorecardGameinfoSerializer(Serializer):
    ID_C = 'id'
    FIELD_C = 'field'
    SCHEDULED_C = 'scheduled'
    STAGE_C = 'stage'
    STANDING_C = 'standing'
    GAME_FINISHED_C = 'gameFinished'
    OFFICIALS_ID_C = 'officials_id'
    OFFICIALS_DESC_C = 'officials__description'
    HOME_C = 'home'
    AWAY_C = 'away'

    ALL_FIELD_VALUES = [ID_C, FIELD_C, SCHEDULED_C, OFFICIALS_ID_C, OFFICIALS_DESC_C, HOME_C, STAGE_C, STANDING_C, AWAY_C, GAME_FINISHED_C]
    ALL_GAME_OVERVIEW_VALUES = [ID_C, FIELD_C, SCHEDULED_C, OFFICIALS_ID_C, OFFICIALS_DESC_C, HOME_C, AWAY_C, GAME_FINISHED_C]
    ALL_SETUP_VALUES = [FIELD_C, SCHEDULED_C, HOME_C, STAGE_C, STANDING_C, AWAY_C]

    id = IntegerField()
    field = IntegerField()
    stage = CharField()
    standing = CharField()
    scheduled = TimeField(format='%H:%M')
    isFinished = SerializerMethodField()
    officialsId = IntegerField(source=OFFICIALS_ID_C)
    officials = CharField(source=OFFICIALS_DESC_C)
    home = CharField()
    away = CharField()

    def __init__(self, *args, **kwargs):
        fields = kwargs.pop('fields', None)
        super().__init__(*args, **kwargs)

        if fields:
            allowed = set(fields)
            existing = set(self.fields.keys())
            for field_name in existing - allowed:
                self.fields.pop(field_name)

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
    games = ScorecardGameinfoSerializer(many=True, fields=ScorecardGameinfoSerializer.ALL_GAME_OVERVIEW_VALUES)


class GameOfficialSerializer(ModelSerializer):
    class Meta:
        model = GameOfficial
        exclude = ('gameinfo',)


class ScorecardCategoryValueSerializer(ModelSerializer):
    class Meta:
        model = ScorecardCategoryValue
        fields = ['value']


class ScorecardCategorySerializer(ModelSerializer):
    values = ScorecardCategoryValueSerializer(many=True, read_only=True)

    class Meta:
        model = ScorecardCategory
        fields = ['name', 'team_option', 'values']


class ScorecardOfficialSerializer(ModelSerializer):
    position_name = SerializerMethodField(source='official_position')

    def get_position_name(self, obj: dict):
        return obj.official_position.name

    class Meta:
        model = ScorecardOfficial
        fields = ['position_name', 'is_optional']


class ScorecardConfigSerializer(ModelSerializer):
    categories = ScorecardCategorySerializer(many=True, read_only=True, source='scorecardcategory_set')
    officials = ScorecardOfficialSerializer(many=True, read_only=True, source='scorecardofficial_set')

    class Meta:
        model = ScorecardConfig
        fields = ['officials', 'categories']
