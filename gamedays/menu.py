from gamedays.urls import LEAGUE_GAMEDAY_CREATE
from league_manager.base_menu import BaseMenu, MenuItem


class GamedaysMenuAdmin(BaseMenu):
    @classmethod
    def get_name(cls):
        return 'Orga'

    def get_menu_items(self, request):
        if not request.user.is_staff:
            return []
        return [
            MenuItem.create(
                name='Spieltag erstellen',
                url=LEAGUE_GAMEDAY_CREATE,
            ),
            MenuItem.create(
                name='Backend',
                url='admin:index',
            ),
        ]