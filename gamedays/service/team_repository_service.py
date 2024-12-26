from django.core.cache import cache

from gamedays.models import Team


class TeamRepositoryService:
    def __init__(self, team_id):
        self.team = Team.objects.get(pk=team_id)

    def get_team_id(self):
        return self.team.pk

    def get_team_description(self):
        return self.team.description

    @staticmethod
    def get_all_teams():
        cache_key = "all_teams"
        cached_teams = cache.get(cache_key)

        if cached_teams is not None:
            return cached_teams

        teams = Team.objects.all().exclude(location='dummy').order_by('description')
        cache.set(cache_key, teams, timeout=60 * 60 * 24)
        return teams
