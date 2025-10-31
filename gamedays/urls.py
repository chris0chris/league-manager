from django.urls import path

from .constants import LEAGUE_GAMEDAY_DETAIL, LEAGUE_GAMEDAY_LIST, LEAGUE_GAMEDAY_LIST_AND_YEAR, \
    LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE, LEAGUE_GAMEDAY_CREATE, LEAGUE_GAMEDAY_DELETE, LEAGUE_GAMEDAY_UPDATE, \
    LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, LEAGUE_GAMEDAY_GAMEINFOS_DELETE, LEAGUE_GAMEDAY_GAMEINFOS_WIZARD
from .views import GamedayDetailView, GamedayListView, GamedayCreateView, GamedayUpdateView, GameinfoWizard, \
    GameinfoUpdateView, GamedayDeleteView, GameinfoDeleteView

urlpatterns = [
    path('', GamedayListView.as_view(), name='league-home'),
    path('gamedays/', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST),
    path('gamedays/<int:season>/', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST_AND_YEAR),
    path('gamedays/<int:season>/<str:league>/', GamedayListView.as_view(), name=LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE),
    path('gameday/<int:pk>/', GamedayDetailView.as_view(), name=LEAGUE_GAMEDAY_DETAIL),
    path('gameday/new/', GamedayCreateView.as_view(), name=LEAGUE_GAMEDAY_CREATE),
    path('gameday/<int:pk>/update/', GamedayUpdateView.as_view(), name=LEAGUE_GAMEDAY_UPDATE),
    path('gameday/<int:pk>/delete/', GamedayDeleteView.as_view(), name=LEAGUE_GAMEDAY_DELETE),
    path('gameday/<int:pk>/gameinfos/wizard/', GameinfoWizard.as_view(), name=LEAGUE_GAMEDAY_GAMEINFOS_WIZARD),
    path('gameday/<int:pk>/gameinfos/update/', GameinfoUpdateView.as_view(), name=LEAGUE_GAMEDAY_GAMEINFOS_UPDATE),
    path('gameday/<int:pk>/gameinfos/delete/', GameinfoDeleteView.as_view(), name=LEAGUE_GAMEDAY_GAMEINFOS_DELETE),
]
