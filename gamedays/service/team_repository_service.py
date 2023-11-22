from gamedays.models import Team


class TeamRepositoryService:
    def __init__(self, team_id):
        self.team = Team.objects.get(pk=team_id)

    def get_team_id(self):
        return self.team.pk

    def get_team_description(self):
        return self.team.description
