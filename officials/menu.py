from league_manager.base_menu import BaseMenu, MenuItem, MenuDivider
from officials.urls import (
    OFFICIALS_LIST_FOR_ALL_TEAMS,
    OFFICIALS_GAME_OFFICIALS_APPEARANCE,
)


class OfficialsMenu(BaseMenu):
    def get_name(self):
        return "Offizielle"

    def get_menu_items(self, request):
        return [
            MenuItem.create(
                name="Übersicht",
                url=OFFICIALS_LIST_FOR_ALL_TEAMS,
            ),
            MenuItem.create(
                name="Alle Einsätze",
                url=OFFICIALS_GAME_OFFICIALS_APPEARANCE,
            ),
            MenuDivider.create(),
            MenuItem.create(
                name="Einsätze melden",
                url="https://offd.de/offd/moodle/mod/page/view.php?id=315",
                is_static=True,
            ),
        ]
