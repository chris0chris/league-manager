"""
URL configuration for gameday_designer frontend app.

Serves the React application.
"""

from django.urls import path
from gameday_designer.views import index

app_name = "gameday_designer_app"

urlpatterns = [
    path("", index, name="index"),
]
