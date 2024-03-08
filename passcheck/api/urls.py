from django.urls import path

from passcheck.api.views import (PasscheckRosterAPIView, PasscheckGamesAPIView, PasscheckGamesStatusAPIView,
                                 PasscheckApprovalUrlAPIView)

API_PASSCHECK_GAMES_STATUS = 'api-passcheck-games-status'
API_PASSCHECK_LIST = 'api-passcheck-list'
API_PASSCHECK_SERVICE = 'api-passcheck-service'
API_PASSCHECK_SERVICE_PLAYERS = 'api-passcheck-service-players'
API_PASSCHECK_EQUIPMENT_APPROVAL_URL = 'api-passcheck-equipment-approval-url'

# Mapping which URL connects to which view
urlpatterns = [
    path('games', PasscheckGamesAPIView.as_view(), name=API_PASSCHECK_SERVICE),
    path('approval/team/<int:team_id>', PasscheckApprovalUrlAPIView.as_view(), name=API_PASSCHECK_EQUIPMENT_APPROVAL_URL),
    path('games/status', PasscheckGamesStatusAPIView.as_view(), name=API_PASSCHECK_GAMES_STATUS),
    path('games/<int:gameday>', PasscheckGamesAPIView.as_view(), name=API_PASSCHECK_SERVICE),
    path('roster/<int:pk>/gameday/<int:gameday>', PasscheckRosterAPIView.as_view(),
         name=API_PASSCHECK_SERVICE_PLAYERS),
]
