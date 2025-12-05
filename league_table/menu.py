from league_manager.base_menu import BaseMenu, MenuItem
from league_table.constants import (
    LEAGUE_TABLE_OVERALL_TABLE_BY_LEAGUE,
)
from league_table.service.leaguetable_repository import LeagueTableRepository


class League_tableMenu(BaseMenu):
    def get_name(self):
        return 'Ligatabelle'

    def get_menu_items(self, request):
        league_list = LeagueTableRepository.get_league_list()

        return [MenuItem.create(
                name=league["name"],
                url=LEAGUE_TABLE_OVERALL_TABLE_BY_LEAGUE,
                url_kwargs={"league": league["slug"]}
            ) for league in league_list]
        #     MenuItem.create(
        #         name='Alle Einsätze',
        #         url=OFFICIALS_GAME_OFFICIALS_APPEARANCE,
        #     ),
        #     MenuDivider.create(),
        #     MenuItem.create(
        #         name='Einsätze melden',
        #         url='https://offd.de/offd/moodle/mod/page/view.php?id=315',
        #         is_static=True,
        #     ),
        # ]
