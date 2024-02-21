from django.urls import path

from passcheck.api.views import (PasscheckRosterAPIView, PasscheckGamesAPIView, PasscheckGamesStatusAPIView)

API_PASSCHECK_GAMES_STATUS = 'api-passcheck-games-status'
API_PASSCHECK_LIST = 'api-passcheck-list'
API_PASSCHECK_SERVICE = 'api-passcheck-service'
API_PASSCHECK_SERVICE_PLAYERS = 'api-passcheck-service-players'

# Mapping which URL connects to which view
urlpatterns = [
    path('games/', PasscheckGamesAPIView.as_view(), name=API_PASSCHECK_SERVICE),
    path('games/status', PasscheckGamesStatusAPIView.as_view(), name=API_PASSCHECK_GAMES_STATUS),
    path('games/<int:gameday>/', PasscheckGamesAPIView.as_view(), name=API_PASSCHECK_SERVICE),
    path('roster/<int:pk>/gameday/<int:gameday>/', PasscheckRosterAPIView.as_view(),
         name=API_PASSCHECK_SERVICE_PLAYERS),
]
