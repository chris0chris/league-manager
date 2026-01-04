from django.shortcuts import render
from django.views import View

from league_table.constants import LEAGUE_TABLE_OVERALL_TABLE_BY_SLUG_AND_LEAGUE
from league_table.service.league_table_service import LeagueTableService


class LeagueTableView(View):
    template_name = "leaguetable/league_table.html"

    def get(self, request, *args, **kwargs):
        league_slug = kwargs.get("league")
        season_slug = kwargs.get("season")
        league_table_service = LeagueTableService.from_league_and_season(
            league_slug, season_slug
        )
        table = league_table_service.get_standing()
        group_classes = [
            "",
            "table-light",
            "table-secondary",
            "table-info",
            "table-warning",
            "table-primary",
            "table-dark",
            "table-success",
            "table-danger",
        ]

        table["round_index"] = (
            table["standing"].ne(table["standing"].shift()).cumsum() - 1
        )

        # map the color for each round
        table["bg_class"] = table["round_index"].map(
            lambda i: group_classes[i % len(group_classes)]
        )

        # drop round_index if you don't need it
        table = table.drop(columns=["round_index"])

        context = {
            "info": {
                "table": table.to_dict(orient="records"),
                "columns": table.columns,
            },
            "current_season": league_table_service.league_season_config.season.name,
            "current_league": league_slug,
            "seasons": league_table_service.get_seasons_for_league_slug(league_slug),
            "url_pattern": LEAGUE_TABLE_OVERALL_TABLE_BY_SLUG_AND_LEAGUE,
        }
        return render(request, self.template_name, context)


class LeagueScheduleView(View):
    template_name = "leaguetable/all_schedules_list.html"

    def get(self, request, *args, **kwargs):
        gss = LeagueTableService(None)
        render_configs = {
            "index": False,
            "classes": [
                "table",
                "table-hover",
                "table-condensed",
                "table-responsive",
                "text-center",
            ],
            "border": 0,
            "justify": "left",
            "escape": False,
            "table_id": "schedule",
        }
        context = {
            "info": {"schedule": gss.get_all_schedules().to_html(**render_configs)}
        }
        return render(request, self.template_name, context)
