from django.urls import path

from .views import GamedayDetailView, GamedayListView, GamedayCreateView, GamedayUpdateView, GamespreadsDetailView, \
    GamespreadListView

urlpatterns = [
    path('', GamedayListView.as_view(), name='league-home'),
    path('gamedays/', GamedayListView.as_view(), name='league-gameday-list'),
    path('gameday/<int:pk>', GamedayDetailView.as_view(), name='league-gameday-detail'),
    path('gameday/new/', GamedayCreateView.as_view(), name='league-gameday-create'),
    path('gameday/<int:pk>/update', GamedayUpdateView.as_view(), name='league-gameday-update'),
    path('gamespreads/', GamespreadListView.as_view(), name='league-gamespreads-list'),
    path('gamespreads/<int:index>', GamespreadsDetailView.as_view(), name='league-gamespreads-detail'),
]
