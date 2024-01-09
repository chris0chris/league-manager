from django.urls import path

from gamedays.api.game_views import GameLogAPIView, GameHalftimeAPIView, GameFinalizeUpdateView, \
    GameSetupCreateOrUpdateView, GamesToWhistleAPIView, ConfigPenalties, GamePossessionAPIView
from gamedays.api.views import GamedayListAPIView, GameinfoUpdateAPIView, GamedayRetrieveUpdate, \
    GamedayScheduleView, GameOfficialCreateOrUpdateView

API_GAMEDAY_WHISTLEGAMES = 'api-gameday-whistlegames'

API_GAMEDAY_LIST = 'api-gameday-list'

API_GAMELOG = 'api-gamelog'

API_CONFIG_SCORECARD_PENALTIES = 'api-config-scorecard-penalties'
API_GAME_POSSESSION = 'api-game-possession'
API_GAME_FINALIZE = 'api-game-finalize'
API_GAME_HALFTIME = 'api-game-halftime'
API_GAME_OFFICIALS = 'api-game-officials'
API_GAME_SETUP = 'api-game-setup'

urlpatterns = [
    path('gameday/list/', GamedayListAPIView.as_view(), name=API_GAMEDAY_LIST),
    path('gameinfo/<int:pk>/', GameinfoUpdateAPIView.as_view(), name='api-gameinfo-retrieve-update'),
    path('gameday/<int:pk>/', GamedayRetrieveUpdate.as_view(), name='api-gameday-retrieve-update'),
    path('gameday/<int:pk>/details', GamedayScheduleView.as_view(), name='api-gameday-schedule'),
    path('gameday/<int:pk>/officials/<str:team>', GamesToWhistleAPIView.as_view(), name=API_GAMEDAY_WHISTLEGAMES),
    path('gamelog/<int:id>', GameLogAPIView.as_view(), name=API_GAMELOG),
    path('game/<int:pk>/setup', GameSetupCreateOrUpdateView.as_view(), name=API_GAME_SETUP),
    path('game/<int:pk>/officials', GameOfficialCreateOrUpdateView.as_view(), name=API_GAME_OFFICIALS),
    path('game/<int:pk>/halftime', GameHalftimeAPIView.as_view(), name=API_GAME_HALFTIME),
    path('game/<int:pk>/finalize', GameFinalizeUpdateView.as_view(), name=API_GAME_FINALIZE),
    path('game/<int:pk>/possession', GamePossessionAPIView.as_view(), name=API_GAME_POSSESSION),
    path('config/scorecard/penalties', ConfigPenalties.as_view(), name=API_CONFIG_SCORECARD_PENALTIES)
]
