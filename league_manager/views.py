from django.contrib.auth.mixins import UserPassesTestMixin
from django.core.cache import cache
from django.shortcuts import render, redirect
from django.views import View

from gamedays.service.team_repository_service import TeamRepositoryService


def homeview(request):
    return render(request, 'homeview.html')


class ClearCacheView(View, UserPassesTestMixin):

    def get(self, request):
        cache.clear()
        return redirect(request.META.get('HTTP_REFERER', '/'))

    def test_func(self):
        return self.request.user.is_staff


class AllTeamListView(View):
    template_name = 'team/all_teams_list.html'

    def get(self, request, **kwargs):
        all_teams = TeamRepositoryService.get_all_teams()
        context = {
            'object_list': all_teams,
            'app': kwargs.get('app'),
        }
        return render(request, self.template_name, context)
