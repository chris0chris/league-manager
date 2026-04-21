"""
URL configuration for gameday_designer app.

Exposes REST API for template management.
Note: Frontend app view is in app_urls.py
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from gameday_designer.views import ScheduleTemplateViewSet, TeamCreationView, TeamBulkCreationView, LeagueTeamsView, ConfigView

# Create router for ViewSets (for API)
router = DefaultRouter()
router.register(r"templates", ScheduleTemplateViewSet, basename="template")

app_name = "gameday_designer"

# API URLs (will be mounted at /api/designer/ in main urls.py)
urlpatterns = [
    path("", include(router.urls)),
    path("config/", ConfigView.as_view(), name="config"),
    path("teams/", TeamCreationView.as_view(), name="team-create"),
    path("teams/bulk/", TeamBulkCreationView.as_view(), name="team-bulk-create"),
    path("gamedays/<int:gameday_id>/league-teams/", LeagueTeamsView.as_view(), name="league-teams"),
]
