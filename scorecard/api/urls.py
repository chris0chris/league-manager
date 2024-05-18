from django.urls import path

from scorecard.api.views import GamesToWhistleAPIView, GameOfficialCreateOrUpdateView

API_SCORECARD_GAMES_TO_OFFICIATE = 'api-scorecard-games-to-officiate'
API_SCORECARD_GAME_OFFICIALS = 'api-scorecard-game-officials'

urlpatterns = [
    path('gameday/<int:pk>', GamesToWhistleAPIView.as_view(), name=API_SCORECARD_GAMES_TO_OFFICIATE),
    path('game/<int:pk>/officials', GameOfficialCreateOrUpdateView.as_view(), name=API_SCORECARD_GAME_OFFICIALS),
]
