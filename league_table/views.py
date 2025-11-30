from django.shortcuts import render
from django.views import View

from gamedays.models import SeasonLeagueTeam
from league_table.service.league_table import LeagueTable


class LeagueTableView(View):
    template_name = 'leaguetable/league_table.html'

    def get(self, request, *args, **kwargs):
        render_configs = {
            'index': False,
            'classes': ['table', 'table-hover', 'table-condensed', 'table-responsive', 'text-center'],
            'border': 0,
            'justify': 'left',
            'escape': False,
            'table_id': 'schedule',
        }
        try:
            gss = LeagueTable()
            schedule = gss.get_standing(
                        league_slug=kwargs.get('league'),
                        season_slug=kwargs.get('season'))
            schedule = schedule.to_html(**render_configs)
        except SeasonLeagueTeam.DoesNotExist:
            schedule = None
            
        context = {
            'info': {
                'schedule': schedule
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
