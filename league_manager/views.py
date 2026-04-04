from django.shortcuts import render
from django.http import HttpResponse

def homeview(request):
    return render(request, "homeview.html")

def database_error_view(request):
    # Static response to avoid any context processors or database-dependent template rendering
    html = """<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Datenbank nicht erreichbar - LeagueSphere</title>
    <link crossorigin="anonymous" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .error-container { max-width: 600px; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #dc3545; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Datenbank nicht erreichbar</h1>
        <p class="lead mt-4">
            LeagueSphere kann momentan keine Verbindung zur Datenbank herstellen.
        </p>
        <div class="alert alert-warning mt-4" role="alert">
            Wir arbeiten bereits an einer Lösung. Bitte versuche es in ein paar Minuten erneut.
        </div>
        <p class="text-muted small mt-4">
            Vielen Dank für dein Verständnis.
        </p>
    </div>
</body>
</html>"""
    return HttpResponse(html, content_type="text/html", status=503)

def robots_txt_view(request):
    return render(request, "robots.txt", content_type="text/plain")

from django.contrib.auth.mixins import UserPassesTestMixin
from django.core.cache import cache
from django.shortcuts import redirect
from django.utils.http import url_has_allowed_host_and_scheme
from django.views import View
from gamedays.service.team_repository_service import TeamRepositoryService

class ClearCacheView(UserPassesTestMixin, View):
    def get(self, request):
        cache.clear()
        referer = request.META.get("HTTP_REFERER", "/")
        if url_has_allowed_host_and_scheme(referer, allowed_hosts={request.get_host()}):
            return redirect(referer)
        return redirect("/")
    def test_func(self):
        return self.request.user.is_staff

class AllTeamListView(View):
    template_name = "team/all_teams_list.html"
    def get(self, request, **kwargs):
        all_teams = TeamRepositoryService.get_all_teams()
        context = {
            "object_list": all_teams,
            "app": kwargs.get("app"),
        }
        return render(request, self.template_name, context)
