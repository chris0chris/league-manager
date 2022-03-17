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

    def __init__(self, display_names_for_team=None, is_staff=False, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.display_names_for_team = display_names_for_team
        self.is_staff = is_staff

    def get_infos(self, object: GameOfficial):
        home = object.gameinfo.gameresult_set.get(isHome=True).team.name
        away = object.gameinfo.gameresult_set.get(isHome=False).team.name
        if object.official is not None:
            team = object.official.team
            team_name = team.name
            team_id = team.pk
        else:
            team_name = object.gameinfo.officials.name
            team_id = object.gameinfo.officials.pk
        return {
            'team': team_name,
            'team_id': team_id,
            'gameday': object.gameinfo.gameday.name,
            'date': object.gameinfo.gameday.date.strftime('%d.%m.%Y'),
            'vs': home + ' vs ' + away,
            'standing': object.gameinfo.standing,
        }

    def obfuscate_name(self, object: GameOfficial):
        official_name = self._get_official_name(object)
        if self.display_names_for_team == object.gameinfo.officials.name or self.is_staff:
            return official_name
        return re.sub('\B[a-zäöüÄÖÜßé]', '*', official_name)

    def _get_official_name(self, game_official):
        if game_official.official is not None:
            return f'{game_official.official.first_name} {game_official.official.last_name}'
        return game_official.name

    class Meta:
        model = GameOfficial
        fields = '__all__'