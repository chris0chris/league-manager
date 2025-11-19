from gamedays.constants import LEAGUE_GAMEDAY_CREATE
from league_manager.base_menu import BaseMenu, MenuItem


class GamedaysMenuAdmin(BaseMenu):
    @classmethod
    def get_name(cls):
        return "Orga"

    def get_menu_items(self, request):
        if not request.user.is_staff:
            return []
        return [
            MenuItem.create(
                name="Spieltag erstellen",
                url=LEAGUE_GAMEDAY_CREATE,
            ),
            MenuItem.create(
                name="Manager Dashboard",
                url="manager-dashboard",
            ),
            MenuItem.create(
                name="Backend",
                url="admin:index",
            ),
        ]


class GamedaysMenuManager(BaseMenu):
    """Menu for non-staff users with manager permissions"""

    @classmethod
    def get_name(cls):
        return "Manager"

    def get_menu_items(self, request):
        if not request.user.is_authenticated or request.user.is_staff:
            return (
                []
            )  # Staff uses GamedaysMenuAdmin, anonymous users have no permissions

        # Check if user has any manager permissions
        from gamedays.models import LeagueManager, GamedayManager, TeamManager

        has_permissions = (
            LeagueManager.objects.filter(user=request.user).exists()
            or GamedayManager.objects.filter(user=request.user).exists()
            or TeamManager.objects.filter(user=request.user).exists()
        )

        if not has_permissions:
            return []

        return [
            MenuItem.create(
                name="Manager Dashboard",
                url="manager-dashboard",
            ),
        ]
