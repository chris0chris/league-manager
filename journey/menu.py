from league_manager.base_menu import BaseMenu, MenuItem


class JourneyMenu(BaseMenu):
    """Menu for journey dashboard with staff restriction."""

    def get_name(self):
        """Return the menu group name."""
        return "Analytics"

    def get_menu_items(self, request):
        """
        Return menu items only for staff users.

        Args:
            request: The HTTP request object

        Returns:
            List of menu items if authorized, empty list otherwise
        """
        if not self._is_authorized_user(request):
            return []

        return [
            MenuItem.create(
                name="Journey Dashboard",
                url="journey-dashboard",
                permissions=[]
            )
        ]

    @staticmethod
    def _is_authorized_user(request):
        """
        Check if user is authenticated and is staff.

        Args:
            request: The HTTP request object

        Returns:
            True if user is authorized, False otherwise
        """
        if request.user is None:
            return False
        return request.user.is_authenticated and request.user.is_staff
