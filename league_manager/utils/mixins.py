from django.contrib.auth.mixins import UserPassesTestMixin
from league_manager.utils.manager_permissions import ManagerPermissionHelper


class LeagueManagerRequiredMixin(UserPassesTestMixin):
    """
    Require user to be league manager for the league
    Subclasses should override get_league_id() and optionally get_season_id()
    """

    def test_func(self):
        if self.request.user.is_staff:
            return True

        league_id = self.get_league_id()
        season_id = self.get_season_id()

        if not league_id:
            return False

        from gamedays.models import League, Season

        try:
            league = League.objects.get(pk=league_id)
            season = Season.objects.get(pk=season_id) if season_id else None
            return ManagerPermissionHelper.is_league_manager(self.request.user, league, season)
        except (League.DoesNotExist, Season.DoesNotExist):
            return False

    def get_league_id(self):
        """
        Override to provide league ID
        Can be from kwargs, GET params, or form data
        """
        return self.kwargs.get('league_id') or self.request.GET.get('league')

    def get_season_id(self):
        """
        Override to provide season ID (optional)
        Can be from kwargs, GET params, or form data
        """
        return self.kwargs.get('season_id') or self.request.GET.get('season')


class GamedayManagerRequiredMixin(UserPassesTestMixin):
    """
    Require user to be gameday manager
    Works with views that have a gameday pk in URL
    """

    def test_func(self):
        if self.request.user.is_staff:
            return True

        gameday_id = self.kwargs.get('pk')
        if not gameday_id:
            return False

        from gamedays.models import Gameday

        try:
            gameday = Gameday.objects.get(pk=gameday_id)
            return ManagerPermissionHelper.is_gameday_manager(self.request.user, gameday)
        except Gameday.DoesNotExist:
            return False


class TeamManagerRequiredMixin(UserPassesTestMixin):
    """
    Require user to be team manager
    Subclasses should override get_team_id() if not using 'pk' or 'team_id'
    """

    def test_func(self):
        if self.request.user.is_staff:
            return True

        team_id = self.get_team_id()
        if not team_id:
            return False

        from gamedays.models import Team

        try:
            team = Team.objects.get(pk=team_id)
            return ManagerPermissionHelper.is_team_manager(self.request.user, team)
        except Team.DoesNotExist:
            return False

    def get_team_id(self):
        """
        Override to provide team ID
        Default looks for 'pk' or 'team_id' in URL kwargs
        """
        return self.kwargs.get('team_id') or self.kwargs.get('pk')
