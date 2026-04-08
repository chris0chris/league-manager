from league_manager.base_menu import BaseMenu, MenuItem, MenuDivider
from officials.urls import (
    OFFICIALS_LIST_FOR_ALL_TEAMS,
    OFFICIALS_GAME_OFFICIALS_APPEARANCE,
    OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE,
    OFFICIALS_LICENSE_CHECK,
)


class OfficialsMenu(BaseMenu):
    def get_name(self):
        return "Offizielle"

    def get_menu_items(self, request):
        items = [
            MenuItem.create(
                name="Übersicht",
                url=OFFICIALS_LIST_FOR_ALL_TEAMS,
            ),
            MenuItem.create(
                name="Alle Einsätze",
                url=OFFICIALS_GAME_OFFICIALS_APPEARANCE,
            ),
        ]
        if request.user.is_superuser:
            items.append(
                MenuItem.create(
                    name="Offizielle Internal Eintrag",
                    url=OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE,
                )
            )
            items.append(
                MenuItem.create(
                    name="Moodle Report",
                    url="/officials/moodle-report/?ids=",
                    is_static=True,
                )
            )
            items.append(
                MenuItem.create(
                    name="Moodle Lizenz check",
                    url=OFFICIALS_LICENSE_CHECK,
                    url_kwargs={"course_id": "15"},
                )
            )
        items.extend(
            [
                MenuDivider.create(),
                MenuItem.create(
                    name="Einsätze melden",
                    url="https://offd.de/offd/moodle/mod/page/view.php?id=315",
                    is_static=True,
                ),
            ]
        )

        return items
