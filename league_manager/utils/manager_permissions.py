from django.db import models


class ManagerPermissionHelper:
    """Helper class for checking manager permissions across the hierarchy"""

    @staticmethod
    def is_league_manager(user, league, season=None):
        """
        Check if user is a league manager for given league/season

        Args:
            user: Django User object
            league: League object
            season: Season object (optional)

        Returns:
            bool: True if user is league manager
        """
        if user.is_staff:
            return True

        from gamedays.models import LeagueManager

        query = LeagueManager.objects.filter(user=user, league=league)
        if season:
            # Match specific season OR all seasons (season=NULL)
            query = query.filter(models.Q(season=season) | models.Q(season__isnull=True))

        return query.exists()

    @staticmethod
    def is_gameday_manager(user, gameday):
        """
        Check if user can manage specific gameday
        Checks both direct gameday assignment and league manager role

        Args:
            user: Django User object
            gameday: Gameday object

        Returns:
            bool: True if user is gameday manager
        """
        if user.is_staff:
            return True

        from gamedays.models import GamedayManager, LeagueManager

        # Check direct gameday assignment
        if GamedayManager.objects.filter(user=user, gameday=gameday).exists():
            return True

        # Check league manager (league managers can manage all gamedays in their league)
        return LeagueManager.objects.filter(
            user=user,
            league=gameday.league,
        ).filter(
            models.Q(season=gameday.season) | models.Q(season__isnull=True)
        ).exists()

    @staticmethod
    def is_team_manager(user, team):
        """
        Check if user can manage specific team

        Args:
            user: Django User object
            team: Team object

        Returns:
            bool: True if user is team manager
        """
        if user.is_staff:
            return True

        from gamedays.models import TeamManager

        return TeamManager.objects.filter(user=user, team=team).exists()

    @staticmethod
    def get_managed_leagues(user, season=None):
        """
        Get all leagues a user can manage

        Args:
            user: Django User object
            season: Season object (optional)

        Returns:
            QuerySet: League objects user can manage
        """
        from gamedays.models import LeagueManager, League

        if user.is_staff:
            return League.objects.all()

        query = LeagueManager.objects.filter(user=user)
        if season:
            query = query.filter(models.Q(season=season) | models.Q(season__isnull=True))

        return League.objects.filter(id__in=query.values_list('league_id', flat=True))

    @staticmethod
    def get_managed_gamedays(user, season=None):
        """
        Get all gamedays a user can manage
        Includes both direct assignments and league-based access

        Args:
            user: Django User object
            season: Season object (optional)

        Returns:
            QuerySet: Gameday objects user can manage
        """
        from gamedays.models import GamedayManager, LeagueManager, Gameday

        if user.is_staff:
            query = Gameday.objects.all()
            if season:
                query = query.filter(season=season)
            return query

        # Direct gameday assignments
        direct_gamedays = GamedayManager.objects.filter(user=user).values_list('gameday_id', flat=True)

        # League manager assignments
        league_query = LeagueManager.objects.filter(user=user)
        if season:
            league_query = league_query.filter(models.Q(season=season) | models.Q(season__isnull=True))
        league_ids = league_query.values_list('league_id', flat=True)

        query = Gameday.objects.filter(
            models.Q(id__in=direct_gamedays) | models.Q(league_id__in=league_ids)
        )
        if season:
            query = query.filter(season=season)

        return query

    @staticmethod
    def get_managed_teams(user):
        """
        Get all teams a user can manage

        Args:
            user: Django User object

        Returns:
            QuerySet: Team objects user can manage
        """
        from gamedays.models import TeamManager, Team

        if user.is_staff:
            return Team.objects.all()

        return Team.objects.filter(
            id__in=TeamManager.objects.filter(user=user).values_list('team_id', flat=True)
        )

    @staticmethod
    def can_assign_team_manager(user, team):
        """
        Check if user can assign a team manager to a team
        League managers can assign team managers for teams in their league

        Args:
            user: Django User object
            team: Team object

        Returns:
            bool: True if user can assign team managers
        """
        if user.is_staff:
            return True

        from gamedays.models import SeasonLeagueTeam, LeagueManager, League, Season

        # Check if user is league manager for any league containing this team
        team_leagues = SeasonLeagueTeam.objects.filter(team=team).select_related('league', 'season')

        for slt in team_leagues:
            if ManagerPermissionHelper.is_league_manager(user, slt.league, slt.season):
                return True

        return False

    @staticmethod
    def get_gameday_manager_permissions(user, gameday):
        """
        Get specific permissions a user has for a gameday

        Args:
            user: Django User object
            gameday: Gameday object

        Returns:
            dict: Permission flags (can_edit_details, can_assign_officials, can_manage_scores)
                  Returns None if user is not a gameday manager
        """
        if user.is_staff:
            return {
                'can_edit_details': True,
                'can_assign_officials': True,
                'can_manage_scores': True,
            }

        from gamedays.models import GamedayManager

        # Check direct gameday assignment
        gm = GamedayManager.objects.filter(user=user, gameday=gameday).first()
        if gm:
            return {
                'can_edit_details': gm.can_edit_details,
                'can_assign_officials': gm.can_assign_officials,
                'can_manage_scores': gm.can_manage_scores,
            }

        # League managers have full permissions
        if ManagerPermissionHelper.is_league_manager(user, gameday.league, gameday.season):
            return {
                'can_edit_details': True,
                'can_assign_officials': True,
                'can_manage_scores': True,
            }

        return None

    @staticmethod
    def get_team_manager_permissions(user, team):
        """
        Get specific permissions a user has for a team

        Args:
            user: Django User object
            team: Team object

        Returns:
            dict: Permission flags (can_edit_roster, can_submit_passcheck)
                  Returns None if user is not a team manager
        """
        if user.is_staff:
            return {
                'can_edit_roster': True,
                'can_submit_passcheck': True,
            }

        from gamedays.models import TeamManager

        tm = TeamManager.objects.filter(user=user, team=team).first()
        if tm:
            return {
                'can_edit_roster': tm.can_edit_roster,
                'can_submit_passcheck': tm.can_submit_passcheck,
            }

        return None
