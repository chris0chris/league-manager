from datetime import datetime

from officials.models import Official
from officials.service.officials_appearance import OfficialAppearanceTeamList
from teammanager.models import Team


class OfficialService:
    def get_officials_for(self, team_id, year=None, are_names_obfuscated=True):
        if year is None:
            today = datetime.today()
            year = today.year
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
