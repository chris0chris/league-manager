from django.urls import path

from scorecard2.api.views import SpecificGamedayAndGamesToOfficiateAPIView, GameOfficialCreateOrUpdateView, \
    GamedaysAndGamesToOfficiateAPIView

API_SCORECARD_SPECIFIC_GAMEDAY_AND_GAMES_TO_OFFICIATE = 'api-scorecard-specific-gameday-and-games-to-officiate'
API_SCORECARD_GAMEDAYS_AND_GAMES_TO_OFFICIATE = 'api-scorecard-gamedays-and-games-to-officiate'
API_SCORECARD_GAME_OFFICIALS = 'api-scorecard-game-officials'

urlpatterns = [
    path('gameday/list', GamedaysAndGamesToOfficiateAPIView.as_view(),
         name=API_SCORECARD_GAMEDAYS_AND_GAMES_TO_OFFICIATE),
    path('gameday/<int:pk>', SpecificGamedayAndGamesToOfficiateAPIView.as_view(),
         name=API_SCORECARD_SPECIFIC_GAMEDAY_AND_GAMES_TO_OFFICIATE),
    path('game/<int:pk>/officials', GameOfficialCreateOrUpdateView.as_view(),
         name=API_SCORECARD_GAME_OFFICIALS),
]
