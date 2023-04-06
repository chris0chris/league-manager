from gamedays.models import Team


class TeamWrapper(object):
    def __init__(self, team_id):
        self.team_id = team_id

    def get_team_description(self):
        try:
            return Team.objects.get(id=self.team_id).description
        except Team.DoesNotExist:
            return 'Team nicht gefunden'

    def get_id(self):
        return self.team_id
