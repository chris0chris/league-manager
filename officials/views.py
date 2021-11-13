# Create your views here.
from django.contrib.auth.mixins import UserPassesTestMixin, LoginRequiredMixin
from django.shortcuts import render
from django.views import View

from officials.models import Official
from officials.service.official_service import OfficialService
from teammanager.models import Team


class OfficialsTeamListView(LoginRequiredMixin, UserPassesTestMixin, View):
    model = Official
    template_name = 'officials/officials_list.html'

    def get(self, request, *args, **kwargs):
        team_id = kwargs.get('pk')
        year = kwargs.get('year')
        official_service = OfficialService()
        context = {'object_list': official_service.get_officials_for(team_id, year)}
        return render(request, self.template_name, context)

    def test_func(self):
        team_id = self.kwargs.get('pk')
        team: Team = Team.objects.get(pk=team_id)
        if self.request.user.is_staff:
            return True
        return self.request.user.username == team.name
