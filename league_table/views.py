from django.shortcuts import render
from django.views import View

from league_table.service.league_table import LeagueTable


class OverallLeagueTableView(View):
    template_name = 'gamedays/gameday_detail.html'

    def get(self, request, *args, **kwargs):
        gss = LeagueTable()
        context = {
            'info': {
                'schedule': gss.get_standing().to_html()
            }
        }
        return render(request, self.template_name, context)
