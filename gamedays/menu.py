from accesscontrol.menu import AccesscontrolMenu
from gamedays.constants import LEAGUE_GAMEDAY_CREATE
from league_manager.base_menu import BaseMenu, MenuItem


class GamedaysMenuAdmin(BaseMenu):
    @classmethod
    def get_name(cls):
        return 'Orga'

    def get_menu_items(self, request):
        if not request.user.groups.filter(name="Liga-Admin").exists() and not request.user.is_superuser:
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

class GamedaysMenuAddEntryToAccesscontrolMenu(BaseMenu):
    def get_name(self):
        return AccesscontrolMenu.get_name()

    def get_menu_items(self, request):
        if not request.user.groups.filter(name="Liga-Admin").exists() and not request.user.is_superuser:
            return []
        return [MenuItem.create(
                name='Spieltag erstellen',
                url=LEAGUE_GAMEDAY_CREATE,
            ), ]