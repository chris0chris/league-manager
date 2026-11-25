from league_manager.base_menu import BaseMenu, MenuItem, MenuDivider
from officials.urls import (
    OFFICIALS_LIST_FOR_ALL_TEAMS,
    OFFICIALS_STATISTICS,
    OFFICIALS_GAME_OFFICIALS_APPEARANCE,
    OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD,
    OFFICIALS_LICENSE_CHECK,
    OFFICIALS_MY_ASSIGNMENTS_NAV,
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
                name="Statistik",
                url=OFFICIALS_STATISTICS,
            ),
            MenuItem.create(
                name="Alle Einsätze",
                url=OFFICIALS_GAME_OFFICIALS_APPEARANCE,
            ),
        ]
        if request.user.is_superuser:
            # Single entry point for all official entries - the upload
            # page itself offers the file upload plus both manual-entry
            # fallbacks (internal/external without file), so the two
            # separate manual menu items were redundant.
            items.append(
                MenuItem.create(
                    name="Offizielle Einträge",
                    url=OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD,
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
                    name="Meine Einsätze",
                    url=OFFICIALS_MY_ASSIGNMENTS_NAV,
                ),
            ]
        )

        return items
