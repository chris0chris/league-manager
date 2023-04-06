import datetime
import re

from rest_framework.fields import CharField, SerializerMethodField
from rest_framework.serializers import ModelSerializer

from gamedays.models import GameOfficial
from officials.models import Official, OfficialLicenseHistory, EmptyOfficialLicenseHistory
from officials.service.moodle.moodle_service import MoodleService


class Obfuscator:

    @staticmethod
    def obfuscate(*args: str):
        obfuscated_text = ''
        for current_arg in args:
            obfuscated_text += current_arg[0] + 4 * '*'
        return obfuscated_text


class OfficialSerializer(ModelSerializer):
    team = CharField(source='team.description')
    association = SerializerMethodField()
    name = SerializerMethodField()
    is_valid = SerializerMethodField('check_license_validation')
    valid_until = SerializerMethodField()
    license = SerializerMethodField()
    email = SerializerMethodField()
    moodle_service = None

    class Meta:
        model = Official
        exclude = ('external_id',)

    def __init__(self, is_staff=False, fetch_email=False, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.is_staff = is_staff
        if fetch_email:
            self.moodle_service = MoodleService()

    def get_license(self, obj):
        license_history = self._get_license_history(obj)
        return license_history.license.name

    def get_email(self, obj: Official):
        if not self.moodle_service or not self.is_staff:
            return ''
        user_info = self.moodle_service.get_user_info_by(external_id=obj.external_id)
        return user_info.get_email()

    def get_association(self, obj):
        try:
            return obj.association.abbr
        except AttributeError as e:
            return 'Kein Verband hinterlegt'

    def check_license_validation(self, obj):
        newest_license = self._get_license_history(obj)
        date_is_valid = newest_license.valid_until() > datetime.date.today()
        has_valid_license = newest_license.license.pk != 4
        return date_is_valid and has_valid_license

    def get_name(self, obj):
        if self.is_staff:
            return f'{obj.first_name} {obj.last_name}'
        return Obfuscator.obfuscate(obj.first_name, obj.last_name)

    def get_valid_until(self, obj):
        newest_license = self._get_license_history(obj)
        return newest_license.valid_until()

    def _get_license_history(self, obj):
        newest_license: OfficialLicenseHistory = obj.officiallicensehistory_set.last()
        if newest_license is None:
            return EmptyOfficialLicenseHistory()
        return newest_license


class GameOfficialAllInfoSerializer(ModelSerializer):
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
            'game_official_id': object.pk,
            'gameinfo_id': object.gameinfo.pk,
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
        return f'{game_official.name} ?'

    class Meta:
        model = GameOfficial
        fields = '__all__'
