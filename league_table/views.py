from django.shortcuts import render
from django.views import View

from league_table.service.league_table import LeagueTable


class LeagueTableView(View):
    template_name = 'gamedays/gameday_detail.html'

    def get(self, request, *args, **kwargs):
        gss = LeagueTable()
        context = {
            'info': {
                'schedule': gss.get_standing(
                    season=kwargs.get('season'),
                    league=kwargs.get('league')
                ).to_html()
            }
        }
        return render(request, self.template_name, context)
