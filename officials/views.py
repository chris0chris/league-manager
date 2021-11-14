# Create your views here.
from django.shortcuts import render
from django.views import View

from officials.models import Official
from officials.service.official_service import OfficialService
from teammanager.models import Team


class OfficialsTeamListView(View):
    model = Official
    template_name = 'officials/officials_list.html'

    def get(self, request, *args, **kwargs):
        team_id = kwargs.get('pk')
        year = kwargs.get('year')
        official_service = OfficialService()
        if self.is_user_allowed_to_see_official_names(team_id):
            context = {'object_list': official_service.get_officials_for(team_id, year, are_names_obfuscated=False)}
        else:
            context = {'object_list': official_service.get_officials_for(team_id, year)}

        return render(request, self.template_name, context)

    def is_user_allowed_to_see_official_names(self, team_id):
        team: Team = Team.objects.get(pk=team_id)
        if self.request.user.is_staff:
            return True
        return self.request.user.username == team.name
