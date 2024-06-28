from gamedays.models import Team, EmptyTeam


class TeamService:

    @staticmethod
    def get_team_by_id_or_name(team) -> Team | EmptyTeam:
        try:
            if type(team) is str:
                team = Team.objects.get(name=team)
            else:
                team = Team.objects.get(pk=team)
            return team
        except Team.DoesNotExist:
            return EmptyTeam(team)