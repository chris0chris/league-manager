from datetime import datetime

from officials.service.officials_appearance import OfficialAppearanceTeamList


class OfficialService:
    def get_officials_for(self, team_id, year=None, are_names_obfuscated=True):
        if year is None:
            today = datetime.today()
            year = today.year
        officials_list = OfficialAppearanceTeamList(team_id, year)
        result_list = officials_list.as_json()
        if are_names_obfuscated:
            for current_official in result_list.get('officials_list'):
                obfuscated_first_name = self._obfuscate_name(current_official.get('first_name'))
                obfuscated_last_name = self._obfuscate_name(current_official.get('last_name'))
                current_official.update(first_name=obfuscated_first_name, last_name=obfuscated_last_name)
        return result_list

    def _obfuscate_name(self, name: str):
        first_letter = name[0]
        all_other_letters = name[1:]
        return "".join((first_letter, all_other_letters.replace(all_other_letters, "****")))
