from gamedays.menu import GamedaysMenuAdmin
from gamedays.models import Team
from league_manager.base_menu import BaseMenu, MenuItem, MenuDivider
from passcheck.urls import PASSCHECK_TRANSFER_LIST, PASSCHECK_APP, \
    PASSCHECK_LIST_FOR_ALL_TEAMS, PASSCHECK_ROSTER_LIST


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
        if request.user.groups.filter(name="Team-Admin").exists() or request.user.is_superuser:
            teams = Team.objects.filter(teamadminassignment__user=request.user)
            if teams:
                default_menu.append(MenuDivider.create()),
                for team in teams:
                    default_menu.append(MenuItem.create(
                        name=team.description,
                        url=PASSCHECK_ROSTER_LIST,
                        url_kwargs={'pk': team.pk},
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
        if not request.user.groups.filter(name="Liga-Admin").exists() and not request.user.is_superuser:
            return []
        return [MenuItem.create(
            name='offene Transfers',
            url=PASSCHECK_TRANSFER_LIST,
        ), ]
