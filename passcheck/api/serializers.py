from rest_framework.fields import SerializerMethodField, IntegerField, TimeField, BooleanField, CharField
from rest_framework.serializers import Serializer

from league_manager.utils.serializer_utils import ObfuscatorSerializer, ObfuscateField
from passcheck.service.eligibility_validation import EligibilityValidator, ValidationError



class RosterSerializer(ObfuscatorSerializer):
    JERSEY_NUMBER_C = 'jersey_number'
    FIRST_NAME_C = 'player__person__first_name'
    LAST_NAME_C = 'player__person__last_name'
    PASS_NUMBER_C = 'player__pass_number'
    SEX_C = 'player__person__sex'
    YEAR_OF_BIRTH_C = 'player__person__year_of_birth'

    ALL_FIELD_VALUES = ['id', JERSEY_NUMBER_C, 'gameday_jersey', FIRST_NAME_C, LAST_NAME_C,
                        PASS_NUMBER_C, SEX_C, YEAR_OF_BIRTH_C, 'is_selected']
    jersey_number = SerializerMethodField()
    id = IntegerField()
    first_name = ObfuscateField(field_name=FIRST_NAME_C)
    last_name = ObfuscateField(field_name=LAST_NAME_C)
    pass_number = IntegerField(source=PASS_NUMBER_C)
    sex = IntegerField(source=SEX_C)
    gamedays_counter = SerializerMethodField()
    isSelected = BooleanField(source='is_selected')

    def get_jersey_number(self, obj: dict):
        gameday_jersey = obj['gameday_jersey']
        if gameday_jersey is not None:
            return gameday_jersey
        return obj[self.JERSEY_NUMBER_C]

    def get_gamedays_counter(self, obj: dict):
        all_leagues = self.context.get('all_leagues', [])
        gamedays_counters = {}
        for league in all_leagues:
            field_name = f'{league["gamedays__league"]}'
            gamedays_counters[field_name] = obj[field_name]
        return gamedays_counters


class RosterValidationSerializer(RosterSerializer):
    validationError = SerializerMethodField(required=False, method_name='get_validation_error')

    def get_validation_error(self, player: dict):
        validator: EligibilityValidator = self.context.get('validator')
        if not validator:
            return 'Could not validate player due missing validator.'
        try:
            validator.validate(player)
        except ValidationError as exception:
            return str(exception)
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'validationError' in data and data['validationError'] is None:
            del data['validationError']
        ignore_fields = ['sex', 'gamedays_counter']
        for field in ignore_fields:
            data.pop(field, None)
        return data


class PasscheckGamesListSerializer(Serializer):
    SCHEDULED_C = 'scheduled'
    FIELD_C = 'field'
    GAMEDAY_ID_C = 'gameday_id'
    AWAY_ID_C = 'away_id'
    AWAY_C = 'away'
    HOME_ID_C = 'home_id'
    HOME_C = 'home'
    CHECKED_HOME = 'is_checked_home'
    CHECKED_AWAY = 'is_checked_away'

    ALL_FIELD_VALUES = [GAMEDAY_ID_C, FIELD_C, SCHEDULED_C, HOME_C, HOME_ID_C, AWAY_C, AWAY_ID_C, CHECKED_HOME,
                        CHECKED_AWAY]
    gameday_id = IntegerField()
    field = IntegerField()
    scheduled = TimeField()
    home = SerializerMethodField()
    away = SerializerMethodField()

    def get_home(self, obj: dict):
        return self._get_team_values(obj[self.HOME_C], obj[self.HOME_ID_C], obj[self.CHECKED_HOME])

    def get_away(self, obj: dict):
        return self._get_team_values(obj[self.AWAY_C], obj[self.AWAY_ID_C], obj[self.CHECKED_AWAY])

    # noinspection PyMethodMayBeStatic
    def _get_team_values(self, name, team_id, is_checked):
        return {
            'id': team_id,
            'name': name,
            'isChecked': is_checked,
        }


class PlayerAllGamedaysSerializer(Serializer):
    id = IntegerField()
    name = CharField(source='gameday__name')
    date = SerializerMethodField(source='gameday__date')

    def get_date(self, obj: dict):
        return obj['gameday__date'].strftime("%d.%m.%Y")
