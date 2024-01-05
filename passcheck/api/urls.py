from django.urls import path

# importing API views
from passcheck.api.views import (PasscheckListAPIView,
PasscheckGamesListAPIView, PasscheckOfficialsAuthAPIView, PasscheckGamedayTeamsAPIView, PasscheckGamedaysListAPIView, PasscheckUsernamesListAPIView)

# variables for API URLs
API_PASSCHECK_LIST = 'api-passcheck-list'
API_PASSCHECK_GAMES_LIST = 'api-passcheck-games-list'
API_PASSCHECK_OFFICIALS_AUTH = 'api-passcheck-officials-auth'
API_PASSCHECK_GAMEDAY_TEAMS = 'api-passcheck-gameday-teams'
API_PASSCHECK_GAMEDAYS_LIST = 'api-passcheck-gamedays-list'
API_PASSCHECK_USERNAMES = 'api-passcheck-usernames'

# Mapping which URL connects to which view
urlpatterns = [
    path('list/', PasscheckListAPIView.as_view(), name=API_PASSCHECK_LIST),
    path('games/list/', PasscheckGamesListAPIView.as_view(), name=API_PASSCHECK_GAMES_LIST),
    path('officials/auth/', PasscheckOfficialsAuthAPIView.as_view(), name=API_PASSCHECK_OFFICIALS_AUTH),
    path('gameday/teams/', PasscheckGamedayTeamsAPIView.as_view(), name=API_PASSCHECK_GAMEDAY_TEAMS),
    path('gamedays/list/', PasscheckGamedaysListAPIView.as_view(), name=API_PASSCHECK_GAMEDAYS_LIST),
    path('usernames/', PasscheckUsernamesListAPIView.as_view(), name=API_PASSCHECK_USERNAMES),
]
