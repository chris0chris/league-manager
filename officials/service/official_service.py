from datetime import datetime

from django.db.models import Sum

from gamedays.models import Team
from gamedays.service.team_repository_service import TeamRepositoryService
from officials.api.serializers import OfficialGameCountSerializer
from officials.models import Official
from officials.service.game_official_entries import InternalGameOfficialEntry, ExternalGameOfficialEntry
from officials.service.moodle.moodle_service import MoodleService
from officials.service.officials_repository_service import OfficialsRepositoryService


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
        return {
            'season': season,
            'team_id': team_repository_service.get_team_id(),
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
