from django.conf import settings
from django.contrib.auth.mixins import UserPassesTestMixin
from django.core.cache import cache
from django.shortcuts import render, redirect
from django.urls import URLPattern, URLResolver
from django.views import View

from gamedays.service.team_repository_service import TeamRepositoryService


def homeview(request):
    return render(request, 'homeview.html')


URLCONF = __import__(settings.ROOT_URLCONF, {}, {}, [''])


class ClearCacheView(View, UserPassesTestMixin):

    def get(self, request):
        cache.clear()
        return redirect(request.META.get('HTTP_REFERER', '/'))

    def test_func(self):
        return self.request.user.is_staff


class AllUrlsView(View, UserPassesTestMixin):
    template_name = 'league_manager/urls_list.html'

    def get(self, request):
        urls_list = []
        for p in self.list_urls(URLCONF.urlpatterns):
            urls_list += [p]
        context = {
            'object_list': urls_list
        }
        return render(request, self.template_name, context)

    def list_urls(self, patterns, path=None):
        """ recursive """
        if not path:
            path = []
        result = []
        for pattern in patterns:
            if isinstance(pattern, URLPattern):
                result.append(''.join(path) + str(pattern.pattern))
            elif isinstance(pattern, URLResolver):
                result += self.list_urls(pattern.url_patterns, path + [str(pattern.pattern)])
        return result

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
