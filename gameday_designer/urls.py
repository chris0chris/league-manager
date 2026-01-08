"""
URL configuration for gameday_designer app.

Exposes REST API for template management.
Note: Frontend app view is in app_urls.py
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from gameday_designer.views import ScheduleTemplateViewSet

# Create router for ViewSets (for API)
router = DefaultRouter()
router.register(r'templates', ScheduleTemplateViewSet, basename='template')

app_name = 'gameday_designer'

# API URLs (will be mounted at /api/designer/ in main urls.py)
urlpatterns = [
    path('', include(router.urls)),
]
