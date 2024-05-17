from django.urls import path

from scorecard.api.views import GamesToWhistleAPIView

API_SCORECARD_GAMES_TO_OFFICIATE = 'api-scorecard-games-to-officiate'

urlpatterns = [
    path('gameday/<int:pk>', GamesToWhistleAPIView.as_view(), name=API_SCORECARD_GAMES_TO_OFFICIATE),
]
