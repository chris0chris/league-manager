from django.urls import path
from rest_framework.views import APIView

from gamedays.api.views import GamedayListAPIView, GameinfoUpdateAPIView, GamedayRetrieveUpdate, \
    GamedayCreateView, GamedayScheduleView, GameOfficialListCreateView, GameSetupCreateOrUpdateView, GameLogAPIView, \
    GameHalftimeAPIView, GameFinalizeUpdateView

urlpatterns = [
    path('gameday/list/', GamedayListAPIView.as_view(), name='api-gameday-list'),
    path('gameinfo/<int:pk>/', GameinfoUpdateAPIView.as_view(), name='api-gameinfo-retrieve-update'),
    path('gameday/<int:pk>/', GamedayRetrieveUpdate.as_view(), name='api-gameday-retrieve-update'),
    path('gameday/<int:pk>/details', GamedayScheduleView.as_view(), name='api-gameday-schedule'),
    path('gameday/create', GamedayCreateView.as_view(), name='api-gameday-create'),
    path('officials/create', GameOfficialListCreateView.as_view(), name='api-gameofficial-create'),
    path('gamesetup/<int:pk>/', APIView.as_view(), name='api-api-gamesetup'),
    path('gamelog/<int:id>', GameLogAPIView.as_view(), name='api-gamelog'),
    path('game/<int:pk>/halftime', GameHalftimeAPIView.as_view(), name='api-game-halftime'),
    path('game/<int:pk>/finalize', GameFinalizeUpdateView.as_view(), name='api-game-finalize'),
    path('game/<int:pk>/setup', GameSetupCreateOrUpdateView.as_view(), name='api-game-setup'),
]
