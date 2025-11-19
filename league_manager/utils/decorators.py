from functools import wraps

from django.views import View
from rest_framework.exceptions import PermissionDenied

from league_manager.utils.view_utils import PermissionHelper
from league_manager.utils.manager_permissions import ManagerPermissionHelper


def get_user_request_permission(view_func):
    @wraps(view_func)
    def _wrapped_view(request: View, *args, **kwargs):
        user_permission = PermissionHelper.get_user_request_permission(
            request.request, kwargs.get("pk")
        )
        kwargs["user_permission"] = user_permission
        return view_func(request, *args, **kwargs)

    return _wrapped_view


def league_manager_required(view_func):
    """
    Decorator for API views requiring league manager permission
    Checks if user is league manager for the league related to the resource
    """

    @wraps(view_func)
    def _wrapped_view(self, request, *args, **kwargs):
        from gamedays.models import Gameday, League

        gameday_id = kwargs.get("pk") or kwargs.get("gameday_id")
        league_id = kwargs.get("league_id")

        if request.user.is_staff:
            kwargs["is_manager"] = True
            return view_func(self, request, *args, **kwargs)

        if gameday_id:
            try:
                gameday = Gameday.objects.get(pk=gameday_id)
                is_manager = ManagerPermissionHelper.is_league_manager(
                    request.user, gameday.league, gameday.season
                )
            except Gameday.DoesNotExist:
                raise PermissionDenied("Gameday not found")
        elif league_id:
            try:
                league = League.objects.get(pk=league_id)
                is_manager = ManagerPermissionHelper.is_league_manager(
                    request.user, league
                )
            except League.DoesNotExist:
                raise PermissionDenied("League not found")
        else:
            is_manager = False

        if not is_manager:
            raise PermissionDenied("League manager permission required")

        kwargs["is_manager"] = True
        return view_func(self, request, *args, **kwargs)

    return _wrapped_view


def gameday_manager_required(view_func):
    """
    Decorator for API views requiring gameday manager permission
    Checks both direct gameday assignment and league manager role
    """

    @wraps(view_func)
    def _wrapped_view(self, request, *args, **kwargs):
        from gamedays.models import Gameday

        gameday_id = kwargs.get("pk") or kwargs.get("gameday_id")

        if not gameday_id:
            raise ValueError("gameday_id required for gameday manager check")

        if request.user.is_staff:
            kwargs["is_manager"] = True
            kwargs["permissions"] = {
                "can_edit_details": True,
                "can_assign_officials": True,
                "can_manage_scores": True,
            }
            return view_func(self, request, *args, **kwargs)

        try:
            gameday = Gameday.objects.get(pk=gameday_id)
        except Gameday.DoesNotExist:
            raise PermissionDenied("Gameday not found")

        permissions = ManagerPermissionHelper.get_gameday_manager_permissions(
            request.user, gameday
        )

        if not permissions:
            raise PermissionDenied("Gameday manager permission required")

        kwargs["is_manager"] = True
        kwargs["gameday"] = gameday
        kwargs["permissions"] = permissions
        return view_func(self, request, *args, **kwargs)

    return _wrapped_view


def team_manager_required(view_func):
    """
    Decorator for API views requiring team manager permission
    """

    @wraps(view_func)
    def _wrapped_view(self, request, *args, **kwargs):
        from gamedays.models import Team

        team_id = kwargs.get("pk") or kwargs.get("team_id")

        if not team_id:
            raise ValueError("team_id required for team manager check")

        if request.user.is_staff:
            kwargs["is_manager"] = True
            kwargs["permissions"] = {
                "can_edit_roster": True,
                "can_submit_passcheck": True,
            }
            return view_func(self, request, *args, **kwargs)

        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            raise PermissionDenied("Team not found")

        permissions = ManagerPermissionHelper.get_team_manager_permissions(
            request.user, team
        )

        if not permissions:
            raise PermissionDenied("Team manager permission required")

        kwargs["is_manager"] = True
        kwargs["team"] = team
        kwargs["permissions"] = permissions
        return view_func(self, request, *args, **kwargs)

    return _wrapped_view
