from django.urls import path, re_path

from .views import GamedayDetailView, GamedayListView, GamedayCreateView, GamedayUpdateView

LEAGUE_GAMEDAY_DETAIL = 'league-gameday-detail'
LEAGUE_GAMEDAY_LIST = 'league-gameday-list'
LEAGUE_GAMEDAY_LIST_AND_YEAR = 'league-gameday-list-and-year'
LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE = 'league-gameday-list-and-year-and-league'
LEAGUE_GAMEDAY_CREATE = 'league-gameday-create'
LEAGUE_GAMEDAY_UPDATE = 'league-gameday-update'

urlpatterns = [
    path('', GamedayListView.as_view(), name='league-home'),
    path('gamedays/', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST),
    path('gamedays/<int:season>', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST_AND_YEAR),
    path('gamedays/<int:season>/<str:league>', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE),
    path('gameday/<int:pk>', GamedayDetailView.as_view(), name=LEAGUE_GAMEDAY_DETAIL),
    path('gameday/new/', GamedayCreateView.as_view(), name=LEAGUE_GAMEDAY_CREATE),
    path('gameday/<int:pk>/update', GamedayUpdateView.as_view(), name=LEAGUE_GAMEDAY_UPDATE),
]
