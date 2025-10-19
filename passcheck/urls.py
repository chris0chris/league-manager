from django.urls import path
from django.views.generic import TemplateView

from league_manager.views import AllTeamListView
from .views import PasscheckPlayerGamesList, PlayerlistCreateView, RosterView, PasscheckView, PlayerlistUpdateView, \
    PlayerlistTransferView, TransferListView, PlayerlistDeleteView

PASSCHECK_APP = 'passcheck-app-view'

PASSCHECK_PLAYER_GAMES_LIST = 'passcheck-player-games-list'
PASSCHECK_PLAYER_CREATE = 'passcheck-player-create'
PASSCHECK_ROSTER_LIST = 'passcheck-roster-list'
PASSCHECK_ROSTER_LIST_FOR_YEAR = 'passcheck-roster-list-for-year'
PASSCHECK_ROSTER_UPDATE = 'passcheck-player-update'
PASSCHECK_ROSTER_DELETE = 'passcheck-player-delete'
PASSCHECK_ROSTER_TRANSFER = 'passcheck-player-transfer'
PASSCHECK_TEAM_NOT_EXISTENT = 'passcheck-team-not-existent'
PASSCHECK_TRANSFER_LIST = 'passcheck-transfer-list'
PASSCHECK_LIST_FOR_ALL_TEAMS = 'passcheck-list-for-all-teams'

urlpatterns = [
    path('', PasscheckView.as_view(), name=PASSCHECK_APP),
    path('team/all/list/', AllTeamListView.as_view(), name=PASSCHECK_LIST_FOR_ALL_TEAMS, kwargs={'app': 'passcheck'}, ),
    path('team/not-existent/', TemplateView.as_view(template_name='passcheck/team-not-existent.html'),
         name=PASSCHECK_TEAM_NOT_EXISTENT),
    path('player/<int:pk>/games/list/<int:year>/', PasscheckPlayerGamesList.as_view(), name=PASSCHECK_PLAYER_GAMES_LIST),
    path('player/<int:pk>/games/list/', PasscheckPlayerGamesList.as_view(), name=PASSCHECK_PLAYER_GAMES_LIST),
    path('player/create/', PlayerlistCreateView.as_view(), name=PASSCHECK_PLAYER_CREATE),
    path('player/<int:pk>/update/', PlayerlistUpdateView.as_view(), name=PASSCHECK_ROSTER_UPDATE),
    path('player/<int:pk>/delete/', PlayerlistDeleteView.as_view(), name=PASSCHECK_ROSTER_DELETE),
    path('player/<int:pk>/transfer/', PlayerlistTransferView.as_view(), name=PASSCHECK_ROSTER_TRANSFER),
    path('transfer/list/', TransferListView.as_view(), name=PASSCHECK_TRANSFER_LIST),
    path('team/<int:pk>/list/', RosterView.as_view(), name=PASSCHECK_ROSTER_LIST),
    path('team/<int:pk>/list/<int:season>/', RosterView.as_view(), name=PASSCHECK_ROSTER_LIST_FOR_YEAR),
]
