from accesscontrol.urls import ASSOCIATION_ADMIN, LEAGUE_ADMIN, TEAM_ADMIN
from league_manager.base_menu import BaseMenu, MenuItem

class AccesscontrolMenu(BaseMenu):
    @classmethod
    def get_name(cls):
        return 'Admin'

    def get_menu_items(self, request):
        if not request.user.is_authenticated:
            return []

        items = []

        if (request.user.groups.filter(name='Association-Admin').exists()
                or request.user.is_superuser):
            items.append(MenuItem.create(name='Meine Verbände', url=ASSOCIATION_ADMIN))
            items.append(MenuItem.create(name='Meine Ligen', url=LEAGUE_ADMIN))

        if request.user.groups.filter(name='Liga-Admin').exists() or request.user.is_superuser:
            items.append(MenuItem.create(name='Meine Teams', url=TEAM_ADMIN))

        return items