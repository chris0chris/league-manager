import re

from rest_framework.fields import CharField, SerializerMethodField
from rest_framework.serializers import ModelSerializer

from officials.models import Official
from teammanager.models import GameOfficial


class OfficialSerializer(ModelSerializer):
    team = CharField(source='team.description')

    class Meta:
        model = Official
        fields = '__all__'


class GameOfficialAllInfosSerializer(ModelSerializer):
    info = SerializerMethodField('get_infos')
    name = SerializerMethodField('obfuscate_name')

    def get_infos(self, object: GameOfficial):
        home = object.gameinfo.gameresult_set.get(isHome=True).team.name
        away = object.gameinfo.gameresult_set.get(isHome=False).team.name
        return {
            'team': object.gameinfo.officials.name,
            'gameday': object.gameinfo.gameday.name,
            'date': object.gameinfo.gameday.date.strftime('%d.%m.%Y'),
            'vs': home + ' vs ' + away,
            'standing': object.gameinfo.standing,
        }

    def obfuscate_name(self, object: GameOfficial):
        return re.sub('\B[a-zäöüÄÖÜßé]', '*', object.name)

    def _obfuscate_name(self, name: str):
        first_letter = name[0]
        all_other_letters = name[1:]
        return "".join((first_letter, all_other_letters.replace(all_other_letters, "****")))

    class Meta:
        model = GameOfficial
        fields = '__all__'
