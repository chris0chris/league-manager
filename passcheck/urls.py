from django.urls import path

from .views import PasscheckPlayerGamesList, PlayerlistCreateView, RosterView, PasscheckView, PlayerlistUpdateView

PASSCHECK_APP = 'passcheck-app-view'

PASSCHECK_PLAYER_GAMES_LIST = 'passcheck-player-games-list'
PASSCHECK_PLAYER_CREATE = 'passcheck-player-create'
PASSCHECK_ROSTER_LIST = 'passcheck-roster-list'
PASSCHECK_ROSTER_UPDATE = 'passcheck-player-update'

urlpatterns = [
    path('', PasscheckView.as_view(), name=PASSCHECK_APP),
    path('player/<int:id>/games/list/<int:year>', PasscheckPlayerGamesList.as_view(), name=PASSCHECK_PLAYER_GAMES_LIST),
    path('player/<int:id>/games/list', PasscheckPlayerGamesList.as_view(), name=PASSCHECK_PLAYER_GAMES_LIST),
    path('player/create', PlayerlistCreateView.as_view(), name=PASSCHECK_PLAYER_CREATE),
    path('player/<int:pk>/update', PlayerlistUpdateView.as_view(), name=PASSCHECK_ROSTER_UPDATE),
    path('roster/<int:pk>/list', RosterView.as_view(), name=PASSCHECK_ROSTER_LIST),
]
