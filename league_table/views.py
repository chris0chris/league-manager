from django.shortcuts import render
from django.views import View

from gamedays.models import SeasonLeagueTeam
from league_table.service.league_table import LeagueTable


class LeagueTableView(View):
    template_name = 'leaguetable/league_table.html'

    def get(self, request, *args, **kwargs):
        try:
            gss = LeagueTable()
            table = gss.get_standing(
                        league_slug=kwargs.get('league'),
                        season_slug=kwargs.get('season'))
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

            table["round_index"] = table["standing"].ne(table["standing"].shift()).cumsum() - 1

            # map the color for each round
            table["bg_class"] = table["round_index"].map(
                lambda i: group_classes[i % len(group_classes)]
            )

            # drop round_index if you don't need it
            table = table.drop(columns=["round_index"])
        except SeasonLeagueTeam.DoesNotExist:
            table = None

        context = {
            'info': {
                'table': table.to_dict(orient='records'),
                'columns': table.columns
            }
        }
        return render(request, self.template_name, context)


class LeagueScheduleView(View):
    template_name = 'leaguetable/all_schedules_list.html'

    def get(self, request, *args, **kwargs):
        gss = LeagueTable()
        render_configs = {
            'index': False,
            'classes': ['table', 'table-hover', 'table-condensed', 'table-responsive', 'text-center'],
            'border': 0,
            'justify': 'left',
            'escape': False,
            'table_id': 'schedule',
        }
        context = {
            'info': {
                'schedule': gss.get_all_schedules().to_html(**render_configs)
            }
        }
        return render(request, self.template_name, context)
