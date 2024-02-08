from django.urls import path

# importing API views
from passcheck.api.views import (PasscheckRosterAPIView, PasscheckGamesAPIView)

# variables for API URLs
API_PASSCHECK_LIST = 'api-passcheck-list'
API_PASSCHECK_SERVICE = 'api-passcheck-service'
API_PASSCHECK_SERVICE_PLAYERS = 'api-passcheck-service-players'

# Mapping which URL connects to which view
urlpatterns = [
    path('games/', PasscheckGamesAPIView.as_view(), name=API_PASSCHECK_SERVICE),
    path('games/<int:gameday>/', PasscheckGamesAPIView.as_view(), name=API_PASSCHECK_SERVICE),
    path('roster/<int:team>/gameday/<int:gameday>/', PasscheckRosterAPIView.as_view(),
         name=API_PASSCHECK_SERVICE_PLAYERS),
]
