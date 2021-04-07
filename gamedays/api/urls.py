from django.urls import path
from rest_framework.views import APIView

from gamedays.api.views import GamedayListAPIView, GameinfoUpdateAPIView, GamedayRetrieveUpdate, \
    GamedayScheduleView, GameOfficialCreateOrUpdateView, LivetickerAPIView
from gamedays.api.scorecard_views import GameLogAPIView, GameHalftimeAPIView, GameFinalizeUpdateView, \
    GameSetupCreateOrUpdateView, GamesToWhistleAPIView

urlpatterns = [
    path('gameday/list/', GamedayListAPIView.as_view(), name='api-gameday-list'),
    path('gameinfo/<int:pk>/', GameinfoUpdateAPIView.as_view(), name='api-gameinfo-retrieve-update'),
    path('gameday/<int:pk>/', GamedayRetrieveUpdate.as_view(), name='api-gameday-retrieve-update'),
    path('gameday/<int:pk>/details', GamedayScheduleView.as_view(), name='api-gameday-schedule'),
    path('gameday/<int:pk>/officials/<str:team>', GamesToWhistleAPIView.as_view(), name='api-gameday-whistlegames'),
    path('gamesetup/<int:pk>/', APIView.as_view(), name='api-api-gamesetup'),
    path('gamelog/<int:id>', GameLogAPIView.as_view(), name='api-gamelog'),
    path('game/<int:pk>/setup', GameSetupCreateOrUpdateView.as_view(), name='api-game-setup'),
    path('game/<int:pk>/officials', GameOfficialCreateOrUpdateView.as_view(), name='api-game-officials'),
    path('game/<int:pk>/halftime', GameHalftimeAPIView.as_view(), name='api-game-halftime'),
    path('game/<int:pk>/finalize', GameFinalizeUpdateView.as_view(), name='api-game-finalize'),
    path('liveticker', LivetickerAPIView.as_view(), name='api-liveticker-all'),
]
