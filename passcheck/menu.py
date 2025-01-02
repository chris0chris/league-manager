from gamedays.menu import GamedaysMenuAdmin
from league_manager.base_menu import BaseMenu, MenuItem, MenuDivider
from passcheck.urls import PASSCHECK_PLAYER_CREATE, PASSCHECK_TRANSFER_LIST, PASSCHECK_APP, PASSCHECK_LIST_FOR_ALL_TEAMS


class PasscheckMenu(BaseMenu):
    def get_name(self):
        return 'Team'

    def get_menu_items(self, request):
        default_menu = [
            MenuItem.create(
                name='Übersicht',
                url=PASSCHECK_LIST_FOR_ALL_TEAMS,
            ),
            MenuItem.create(
                name='offene Transfers',
                url=PASSCHECK_TRANSFER_LIST,
            ),
        ]
        if request.user.is_authenticated:
            default_menu.append(MenuItem.create(
                name='Player erstellen',
                url=PASSCHECK_PLAYER_CREATE
            ))
        default_menu.extend([
            MenuDivider.create(),
            MenuItem.create(
                name='Scorecard / Passcheck',
                url=PASSCHECK_APP),
        ])
        return default_menu


class PasscheckMenuAddEntryToOrgaGameday(BaseMenu):
    def get_name(self):
        return GamedaysMenuAdmin.get_name()

    def get_menu_items(self, request):
        if not request.user.is_staff:
            return []
        return [MenuItem.create(
            name='offene Transfers',
            url=PASSCHECK_TRANSFER_LIST,
        ), ]
