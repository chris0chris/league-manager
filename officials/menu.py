from league_manager.base_menu import BaseMenu, MenuItem, MenuDivider
from officials.models import Official
from officials.urls import OFFICIALS_LIST_FOR_ALL_TEAMS, OFFICIALS_GAME_OFFICIALS_APPEARANCE, OFFICIALS_LIST_FOR_TEAM

class OfficialsMenu(BaseMenu):
    def get_name(self):
        return 'Offizielle'

    def get_menu_items(self, request):
        menu_items = [
            MenuItem.create(
                name='Übersicht',
                url=OFFICIALS_LIST_FOR_ALL_TEAMS,
            ),
            MenuItem.create(
                name='Alle Einsätze',
                url=OFFICIALS_GAME_OFFICIALS_APPEARANCE,
            ),
        ]

        if request.user.groups.filter(name="Schiedsrichter").exists():
            official = Official.objects.get(user=request.user)
            menu_items.append(MenuDivider.create())
            menu_items.append(MenuItem.create(
                name='Meine Einsätze',
                url=OFFICIALS_LIST_FOR_TEAM,
                url_kwargs={'pk': official.team.pk},
            ))

        menu_items.append(MenuDivider.create())
        menu_items.append(MenuItem.create(
                name='Einsätze melden',
                url='https://offd.de/offd/moodle/mod/page/view.php?id=315',
                is_static=True,
            ))

        return menu_items
