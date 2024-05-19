from django.urls import path

from scorecard2.api.views import GamesToOfficiateAPIView, GameOfficialCreateOrUpdateView

API_SCORECARD_GAMES_TO_OFFICIATE = 'api-scorecard-games-to-officiate'
API_SCORECARD_GAME_OFFICIALS = 'api-scorecard-game-officials'

urlpatterns = [
    path('gameday/<int:pk>', GamesToOfficiateAPIView.as_view(), name=API_SCORECARD_GAMES_TO_OFFICIATE),
    path('game/<int:pk>/officials', GameOfficialCreateOrUpdateView.as_view(), name=API_SCORECARD_GAME_OFFICIALS),
]