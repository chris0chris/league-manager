from rest_framework.fields import CharField, SerializerMethodField, BooleanField, IntegerField, DateField
from rest_framework.serializers import Serializer

from league_manager.utils.serializer_utils import ObfuscatorSerializer, ObfuscateField


class OfficialGamedaySignupSerializer(Serializer):
    PK_C = 'pk'
    DATE_C = 'date'
    NAME_C = 'name'
    OFFICIAL_NAMES_C = 'official_names'
    HAS_SIGNED_UP_C = 'has_signed_up'
    LIMIT_SIGNUP_C = 'limit_signup'
    COUNT_SIGNUP_C = 'count_signup'
    LEAGUE__NAME = 'league__name'

    ALL_FIELD_VALUES = [PK_C, DATE_C, NAME_C, OFFICIAL_NAMES_C, HAS_SIGNED_UP_C, LIMIT_SIGNUP_C, COUNT_SIGNUP_C,
                        LEAGUE__NAME]
    pk = CharField()
    date = DateField(format='%d.%m.')
    name = CharField()
    league = CharField(source=LEAGUE__NAME)
    count_signup = IntegerField()
    limit_signup = IntegerField()
    has_signed_up = BooleanField()
    officials = SerializerMethodField()

    def get_officials(self, obj: dict) -> []:
        officials = obj.get(self.OFFICIAL_NAMES_C)
        if officials is None:
            return []
        all_officials = []
        for official in officials.split(','):
            official_pk_and_name = official.split("#")
            all_officials += [{
                'pk': int(official_pk_and_name[0]),
                'name': official_pk_and_name[1]
            }]
        return all_officials


class GamedaySignedUpOfficialsSerializer(ObfuscatorSerializer):
    LAST_NAME_C = 'official__last_name'
    FIRST_NAME_C = 'official__first_name'
    PK = 'official__pk'
    ALL_FIELD_VALUES = [PK, FIRST_NAME_C, LAST_NAME_C]
    id = IntegerField(source=PK)
    first_name = ObfuscateField(field_name=FIRST_NAME_C)
    last_name = ObfuscateField(field_name=LAST_NAME_C)
