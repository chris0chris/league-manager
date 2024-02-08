from django.urls import path

from .views import PasscheckPlayerGamesList, PlayerlistCreateView, PlayerlistView, PasscheckView

PASSCHECK_APP = 'passcheck-app-view'

PASSCHECK_PLAYER_GAMES_LIST = 'passcheck-player-games-list'
PASSCHECK_ROSTER_CREATE = 'passcheck-roster-create'
PASSCHECK_ROSTER_LIST = 'passcheck-roster-list'

urlpatterns = [
    path('', PasscheckView.as_view(), name=PASSCHECK_APP),
    path('player/<int:id>/games/list/<int:year>', PasscheckPlayerGamesList.as_view(), name=PASSCHECK_PLAYER_GAMES_LIST),
    path('player/<int:id>/games/list', PasscheckPlayerGamesList.as_view(), name=PASSCHECK_PLAYER_GAMES_LIST),
    path('roster/create', PlayerlistCreateView.as_view(), name=PASSCHECK_ROSTER_CREATE),
    path('roster/<int:team>/list', PlayerlistView.as_view(), name=PASSCHECK_ROSTER_LIST),
]
