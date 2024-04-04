from datetime import datetime

from django.db import IntegrityError
from django.db.models import Sum, Case, When, BooleanField, Count, OuterRef, Exists, Subquery, Func, IntegerField, F, \
    Value, CharField
from django.db.models.functions import Concat

from gamedays.models import Team, Gameday
from gamedays.service.team_repository_service import TeamRepositoryService
from officials.api.serializers import OfficialGameCountSerializer
from officials.models import Official, OfficialGamedaySignup
from officials.serializers import OfficialGamedaySignupSerializer
from officials.service.game_official_entries import InternalGameOfficialEntry, ExternalGameOfficialEntry
from officials.service.moodle.moodle_service import MoodleService
from officials.service.officials_repository_service import OfficialsRepositoryService

OFFICIALS_PER_FIELD = 6


class DuplicateEntryError(Exception):
    pass


class OfficialService:
    def __init__(self):
        self.official_repository_service = OfficialsRepositoryService()

    def get_all_officials_with_team_infos(self, team_id, season, is_staff):
        team_repository_service = TeamRepositoryService(team_id)
        all_team_officials = (Official.objects.filter(
            officiallicensehistory__created_at__year=season,
            team=team_repository_service.team)
                              .order_by('last_name', 'first_name'))
        all_team_years_with_official_license = sorted(
            self.official_repository_service.get_all_years_with_team_official_licenses(
                team_repository_service.team
            ),
            reverse=True
        )
        from officials.urls import OFFICIALS_LIST_FOR_TEAM_AND_YEAR
        return {
            'season': season,
            'url_pattern': OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
            'pk': team_id,
            'team_id': team_id,
            'team': team_repository_service.get_team_description(),
            'years': all_team_years_with_official_license,
            'officials_list': OfficialGameCountSerializer(
                many=True,
                instance=all_team_officials,
                season=season,
                is_staff=is_staff).data
        }

    def _obfuscate_result_list(self, result_list):
        for current_official in result_list.get('officials_list').get('list'):
            obfuscated_first_name = self._obfuscate_name(current_official.get('first_name'))
            obfuscated_last_name = self._obfuscate_name(current_official.get('last_name'))
            current_official.update(first_name=obfuscated_first_name, last_name=obfuscated_last_name)

    def _obfuscate_name(self, name: str):
        first_letter = name[0]
        all_other_letters = name[1:]
        return "".join((first_letter, all_other_letters.replace(all_other_letters, "****")))

    def get_all_officials(self, year, are_names_obfuscated=True):
        if year is None:
            today = datetime.today()
            year = today.year
        all_teams = Team.objects.all().order_by('description')
        result_list = []
        current_team: Official
        for current_team in all_teams:
            current_result_list = self.get_officials_for(current_team.pk, year, are_names_obfuscated)
            result_list += current_result_list.get('officials_list')
        return {
            'year': year,
            'officials_list': result_list
        }

    @staticmethod
    def create_game_official_entry(result) -> str:
        entry = InternalGameOfficialEntry(*result)
        return entry.save()

    def create_external_official_entry(self, result) -> str:
        entry = ExternalGameOfficialEntry(*result)
        return entry.save()

    def get_game_count_for_license(self, year: int, course_id: int) -> []:
        moodle_service = MoodleService()
        external_ids = moodle_service.get_all_users_for_course(course_id)
        return self.official_repository_service.get_officials_game_count_for_license(year, external_ids)

    def _aggregate_games(self, external_official_qs):
        all_external_games_count = external_official_qs.aggregate(num_games=Sum('number_games')).get('num_games',
                                                                                                     0) or 0
        return all_external_games_count

    @staticmethod
    def create_signup(gameday_id, official_id):
        gameday = Gameday.objects.get(pk=gameday_id)
        try:
            OfficialGamedaySignup.objects.create(gameday=gameday, official_id=official_id)
        except IntegrityError:
            raise DuplicateEntryError(f'{gameday.name}')

    @staticmethod
    def get_signup_data(official_id):
        signed_up_officials = OfficialGamedaySignup.objects.filter(
            gameday_id=OuterRef('pk'),
            official_id=official_id
        ).values('gameday_id')

        names_signed_up_officials = OfficialGamedaySignup.objects.filter(
            gameday_id=OuterRef('pk')
        ).annotate(
            full_name=Concat('official__pk', Value('#'), 'official__first_name', Value(' '), 'official__last_name')
        ).order_by('official__first_name').values_list('full_name', flat=True)

        all_gamedays = Gameday.objects.filter(date__gte=datetime.today()).annotate(
            has_signed_up=Case(
                When(pk__in=Subquery(signed_up_officials), then=True),
                default=False,
                output_field=BooleanField()
            ),
            count_signup=Count('officialgamedaysignup'),
            limit_signup=(GetFieldPart(F('format'), output_field=IntegerField())) * OFFICIALS_PER_FIELD,
            official_names=Subquery(
                names_signed_up_officials.annotate(
                    names=ConcatOfficialsNames(F('full_name'))
                ).order_by('full_name').values('names'),
                output_field=CharField()
            )
        ).order_by('date', 'pk')

        return OfficialGamedaySignupSerializer(all_gamedays.values(*OfficialGamedaySignupSerializer.ALL_FIELD_VALUES),
                                               many=True).data


class GetFieldPart(Func):
    function = 'SUBSTRING_INDEX'
    template = "%(function)s(%(expressions)s, '_', -1)"
    output_field = IntegerField()


class ConcatOfficialsNames(Func):
    function = 'GROUP_CONCAT'
    template = "%(function)s(%(expressions)s SEPARATOR ', ')"
    output_field = CharField()
