from django.urls import path

from .views import GamedayDetailView, GamedayListView, GamedayCreateView, GamedayUpdateView, GameinfoWizard, \
    GameinfoUpdateView, GamedayDeleteView, GameinfoDeleteView

LEAGUE_GAMEDAY_DETAIL = 'league-gameday-detail'
LEAGUE_GAMEDAY_LIST = 'league-gameday-list'
LEAGUE_GAMEDAY_LIST_AND_YEAR = 'league-gameday-list-and-year'
LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE = 'league-gameday-list-and-year-and-league'
LEAGUE_GAMEDAY_CREATE = 'league-gameday-create'
LEAGUE_GAMEDAY_DELETE = 'league-gameday-delete'
LEAGUE_GAMEDAY_UPDATE = 'league-gameday-update'
LEAGUE_GAMEDAY_GAMEINFOS_UPDATE = 'league-gameday-gameinfos-update'
LEAGUE_GAMEDAY_GAMEINFOS_DELETE = 'league-gameday-gameinfos-delete'
LEAGUE_GAMEDAY_GAMEINFO_WIZARD = 'league-gameday-gameinfos-wizard'

urlpatterns = [
    path('', GamedayListView.as_view(), name='league-home'),
    path('gamedays/', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST),
    path('gamedays/<int:season>/', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST_AND_YEAR),
    path('gamedays/<int:season>/<str:league>/', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE),
    path('gameday/<int:pk>/', GamedayDetailView.as_view(), name=LEAGUE_GAMEDAY_DETAIL),
    path('gameday/new/', GamedayCreateView.as_view(), name=LEAGUE_GAMEDAY_CREATE),
    path('gameday/<int:pk>/update/', GamedayUpdateView.as_view(), name=LEAGUE_GAMEDAY_UPDATE),
    path('gameday/<int:pk>/delete/', GamedayDeleteView.as_view(), name=LEAGUE_GAMEDAY_DELETE),
    path('gameday/<int:pk>/gameinfos/wizard/', GameinfoWizard.as_view(), name=LEAGUE_GAMEDAY_GAMEINFO_WIZARD),
    path('gameday/<int:pk>/gameinfos/update/', GameinfoUpdateView.as_view(), name=LEAGUE_GAMEDAY_GAMEINFOS_UPDATE),
    path('gameday/<int:pk>/gameinfos/delete/', GameinfoDeleteView.as_view(), name=LEAGUE_GAMEDAY_GAMEINFOS_DELETE),
]
