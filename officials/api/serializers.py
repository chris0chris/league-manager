import datetime

from django.db.models import QuerySet, Max
from rest_framework.fields import CharField, SerializerMethodField, BooleanField, DateField, FloatField
from rest_framework.serializers import ModelSerializer

from gamedays.models import GameOfficial
from officials.models import Official, OfficialLicenseHistory, EmptyOfficialLicenseHistory, OfficialExternalGames
from officials.service.moodle.moodle_service import MoodleService


class Obfuscator:

    @staticmethod
    def obfuscate(*args: str):
        obfuscated_text = ''
        for current_arg in args:
            if current_arg is not None and current_arg != '':
                obfuscated_text += current_arg[0] + 4 * '*'
        return obfuscated_text


class OfficialExternalGamesSerializer(ModelSerializer):
    date = DateField(format='%d.%m.%Y')
    notification_date = DateField(format='%d.%m.%Y')
    calculated_number_games = FloatField(read_only=True)
    reporter_name = SerializerMethodField('get_reporter_name')

    class Meta:
        model = OfficialExternalGames
        exclude = ('official',)

    def __init__(self, is_staff=False, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.is_staff = is_staff

    def get_reporter_name(self, obj: OfficialExternalGames):
        if self.is_staff:
            return obj.reporter_name
        return Obfuscator.obfuscate(*obj.reporter_name.split(' ')[:2])


class OfficialSerializer(ModelSerializer):
    team = CharField(source='team.description')
    association = SerializerMethodField()
    name = SerializerMethodField()
    last_name = SerializerMethodField()
    first_name = SerializerMethodField()
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

    def get_last_name(self, obj: Official):
        return self._obfuscate_text_if_needed(obj.last_name)

    def get_first_name(self, obj: Official):
        return self._obfuscate_text_if_needed(obj.first_name)

    def _obfuscate_text_if_needed(self, text: str) -> str:
        if self.is_staff:
            return text
        return Obfuscator.obfuscate(text)

    def get_license(self, obj):
        license_history = self._get_license_history(obj)
        return license_history.license.name

    def get_email(self, obj: Official):
        if not self.moodle_service or not self.is_staff:
            return ''
        user_info = self.moodle_service.get_user_info_by(external_id=obj.external_id)
        return user_info.get_email()

    # noinspection PyMethodMayBeStatic
    def get_association(self, obj):
        try:
            return obj.association.abbr
        except AttributeError:
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

    # noinspection PyMethodMayBeStatic
    def _get_license_history(self, obj):
        newest_license: OfficialLicenseHistory = obj.officiallicensehistory_set.last()
        if newest_license is None:
            return EmptyOfficialLicenseHistory()
        return newest_license


class OfficialGameCountSerializer(OfficialSerializer):
    position_count = SerializerMethodField()

    def __init__(self, season, is_staff=False, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.is_staff = is_staff
        self.season = season

    def get_position_count(self, obj: Official):
        external_games_by_official: QuerySet[OfficialExternalGames] = obj.officialexternalgames_set.filter(
            date__year=self.season)
        referee_ext = sum(
            entry.calculated_number_games for entry in external_games_by_official.filter(position='Referee'))
        down_judge_ext = sum(
            entry.calculated_number_games for entry in external_games_by_official.filter(position='Down Judge'))
        field_judge_ext = sum(
            entry.calculated_number_games for entry in external_games_by_official.filter(position='Field Judge'))
        side_judge_ext = sum(
            entry.calculated_number_games for entry in external_games_by_official.filter(position='Side Judge'))
        mix = sum(entry.calculated_number_games for entry in external_games_by_official.filter(position='Mix'))
        game_officials: QuerySet = obj.gameofficial_set.filter(gameinfo__gameday__date__year=self.season)
        overall_ext = referee_ext + down_judge_ext + field_judge_ext + side_judge_ext + mix
        overall = game_officials.exclude(position='Scorecard Judge').count()
        referee = game_officials.filter(position='Referee').count()
        down_judge = game_officials.filter(position='Down Judge').count()
        field_judge = game_officials.filter(position='Field Judge').count()
        side_judge = game_officials.filter(position='Side Judge').count()
        return {
            'scorecard': {
                'referee': referee,
                'down_judge': down_judge,
                'field_judge': field_judge,
                'side_judge': side_judge,
                'overall': overall,
            },
            'external': {
                'referee': 0 if referee_ext is None else referee_ext,
                'down_judge': 0 if down_judge_ext is None else down_judge_ext,
                'field_judge': 0 if field_judge_ext is None else field_judge_ext,
                'side_judge': 0 if side_judge_ext is None else side_judge_ext,
                'overall': overall_ext,
            },
            'sum': {
                'overall': overall_ext + overall,
                'referee': referee + referee_ext,
                'down_judge': down_judge + down_judge_ext,
                'field_judge': field_judge + field_judge_ext,
                'side_judge': side_judge + side_judge_ext
            }
        }


class OfficialGamelistSerializer(OfficialSerializer):
    is_valid = BooleanField(default=True)
    dffl_games = SerializerMethodField('get_dffl_games')
    external_games = SerializerMethodField('get_external_games')

    def __init__(self, season, is_staff=False, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.is_staff = is_staff
        self.season = season

    def get_external_games(self, obj: Official):
        all_official_entries: QuerySet[OfficialExternalGames] = obj.officialexternalgames_set.filter(
            date__year=self.season)
        return {
            'all_games': OfficialExternalGamesSerializer(instance=all_official_entries, many=True,
                                                         is_staff=self.is_staff).data,
            'number_games': sum(entry.calculated_number_games for entry in all_official_entries),
            'last_update': OfficialExternalGames.objects.all().aggregate(Max('notification_date'))[
                'notification_date__max']
        }

    def get_dffl_games(self, obj: Official):
        all_official_entries: QuerySet[GameOfficial] = obj.gameofficial_set.filter(
            gameinfo__gameday__date__year=self.season).exclude(
            position='Scorecard Judge')
        all_games = []
        for current_official_entry in all_official_entries:
            all_games += [self._get_dffl_game_infos(current_official_entry)]
        return {
            'all_games': all_games,
            'number_games': len(all_games)
        }

    # noinspection PyMethodMayBeStatic
    def _get_dffl_game_infos(self, obj: GameOfficial):
        home = obj.gameinfo.gameresult_set.get(isHome=True).team.description
        away = obj.gameinfo.gameresult_set.get(isHome=False).team.description
        return {
            'position': obj.position,
            'game_official_id': obj.pk,
            'gameinfo_id': obj.gameinfo.pk,
            'gameday': obj.gameinfo.gameday.name,
            'date': obj.gameinfo.gameday.date.strftime('%d.%m.%Y'),
            'vs': home + ' vs ' + away,
            'standing': obj.gameinfo.standing,
        }


class GameOfficialAllInfoSerializer(ModelSerializer):
    info = SerializerMethodField('get_infos')
    name = SerializerMethodField('obfuscate_name')

    def __init__(self, display_names_for_team=None, is_staff=False, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.display_names_for_team = display_names_for_team
        self.is_staff = is_staff

    # noinspection PyMethodMayBeStatic
    def get_infos(self, obj: GameOfficial):
        home = obj.gameinfo.gameresult_set.get(isHome=True).team.name
        away = obj.gameinfo.gameresult_set.get(isHome=False).team.name
        if obj.official is not None:
            team = obj.official.team
            team_name = team.name
            team_id = team.pk
        else:
            team_name = obj.gameinfo.officials.name
            team_id = obj.gameinfo.officials.pk
        return {
            'team': team_name,
            'team_id': team_id,
            'game_official_id': obj.pk,
            'gameinfo_id': obj.gameinfo.pk,
            'gameday': obj.gameinfo.gameday.name,
            'date': obj.gameinfo.gameday.date.strftime('%d.%m.%Y'),
            'vs': home + ' vs ' + away,
            'standing': obj.gameinfo.standing,
        }

    def obfuscate_name(self, obj: GameOfficial):
        official_name = self._get_official_name(obj)
        if self.display_names_for_team == obj.gameinfo.officials.name or self.is_staff:
            return official_name['name']
        obfuscated_name = Obfuscator.obfuscate(*official_name['name'].split(' ')[:2])
        if official_name['is_mapped']:
            return obfuscated_name
        return f'{obfuscated_name} ?'

    # noinspection PyMethodMayBeStatic
    def _get_official_name(self, game_official) -> dict:
        if game_official.official is not None:
            return {
                "is_mapped": True,
                "name": f'{game_official.official.first_name} {game_official.official.last_name}'}
        return {
            "is_mapped": False,
            "name": game_official.name
        }

    class Meta:
        model = GameOfficial
        fields = '__all__'
