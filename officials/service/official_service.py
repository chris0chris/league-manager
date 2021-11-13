from datetime import datetime

from officials.service.officials_appearance import OfficialAppearanceTeamList


class OfficialService:
    def get_officials_for(self, team_id, year=None):
        if year is None:
            today = datetime.today()
            year = today.year
        officials_list = OfficialAppearanceTeamList(team_id, year)
        return officials_list.as_json()
