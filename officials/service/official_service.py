from datetime import datetime

from django.db.models import Sum

from officials.models import Official
from officials.service.game_official_entries import InternalGameOfficialEntry, ExternalGameOfficialEntry
from officials.service.officials_appearance import OfficialAppearanceTeamList
from officials.service.officials_repository_service import OfficialsRepositoryService
from teammanager.models import Team


class OfficialService:
    def __init__(self):
        self.repository_service = OfficialsRepositoryService()

    def get_officials_for(self, team_id, year, are_names_obfuscated=True):
        officials_list = OfficialAppearanceTeamList(team_id, year)
        result_list = officials_list.as_json()
        if are_names_obfuscated:
            self._obfuscate_result_list(result_list)
        return result_list

    def _obfuscate_result_list(self, result_list):
        for current_official in result_list.get('officials_list'):
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

    def create_game_official_entry(self, result) -> str:
        entry = InternalGameOfficialEntry(*result)
        return entry.save()

    def create_external_official_entry(self, result) -> str:
        entry = ExternalGameOfficialEntry(*result)
        return entry.save()

    def get_game_count(self, year: int, external_ids: [int]) -> []:
        return self.repository_service.get_officials_game_count(year, external_ids)

    def _aggregate_games(self, external_official_qs):
        all_external_games_count = external_official_qs.aggregate(num_games=Sum('number_games')).get('num_games',
                                                                                                     0) or 0
        return all_external_games_count
