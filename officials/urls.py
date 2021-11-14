from django.urls import path

from officials.views import OfficialsTeamListView, AllOfficialsListView, GameOfficialListView

OFFICIALS_LIST_FOR_TEAM = 'view-officials-list-for-team'
OFFICIALS_LIST_FOR_TEAM_AND_YEAR = 'view-officials-list-for-team-and-year'
OFFICIALS_LIST_FOR_ALL_TEAMS = 'view-officials-list-for-all-teams'
OFFICIALS_LIST_FOR_ALL_TEAMS_AND_YEAR = 'view-officials-list-for-all-teams-and-year'
OFFICIALS_GAME_OFFICIALS_APPEARANCE = 'view-officials-game-officials-appearance'

urlpatterns = [
    path('team/<int:pk>/list', OfficialsTeamListView.as_view(), name=OFFICIALS_LIST_FOR_TEAM),
    path('team/<int:pk>/list/<int:year>', OfficialsTeamListView.as_view(), name=OFFICIALS_LIST_FOR_TEAM_AND_YEAR),
    path('team/all/list', AllOfficialsListView.as_view(), name=OFFICIALS_LIST_FOR_ALL_TEAMS),
    path('team/all/list/<int:year>', AllOfficialsListView.as_view(), name=OFFICIALS_LIST_FOR_ALL_TEAMS_AND_YEAR),
    path('einsaetze', GameOfficialListView.as_view(), name=OFFICIALS_GAME_OFFICIALS_APPEARANCE),
]
