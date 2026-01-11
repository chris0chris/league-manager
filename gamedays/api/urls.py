from django.urls import path

from gamedays.api.game_views import (
    GameLogAPIView,
    GameHalftimeAPIView,
    GameFinalizeUpdateView,
    GameSetupCreateOrUpdateView,
    GamesToWhistleAPIView,
    ConfigPenalties,
    GamePossessionAPIView,
)
from gamedays.api.views import (
    GamedayListAPIView,
    GameinfoUpdateAPIView,
    GamedayRetrieveUpdate,
    GamedayScheduleView,
    GameOfficialCreateOrUpdateView,
)
from gamedays.constants import (
    API_GAMEDAY_WHISTLEGAMES,
    API_GAMEDAY_LIST,
    API_GAMELOG,
    API_CONFIG_SCORECARD_PENALTIES,
    API_GAME_POSSESSION,
    API_GAME_FINALIZE,
    API_GAME_HALFTIME,
    API_GAME_OFFICIALS,
    API_GAME_SETUP,
)

urlpatterns = [
    path("gameday/list/", GamedayListAPIView.as_view(), name=API_GAMEDAY_LIST),
    path(
        "gameinfo/<int:pk>/",
        GameinfoUpdateAPIView.as_view(),
        name="api-gameinfo-retrieve-update",
    ),
    path(
        "gameday/<int:pk>/",
        GamedayRetrieveUpdate.as_view(),
        name="api-gameday-retrieve-update",
    ),
    path(
        "gameday/<int:pk>/details",
        GamedayScheduleView.as_view(),
        name="api-gameday-schedule",
    ),
    path(
        "gameday/<int:pk>/officials/<str:team>",
        GamesToWhistleAPIView.as_view(),
        name=API_GAMEDAY_WHISTLEGAMES,
    ),
    path("gamelog/<int:id>", GameLogAPIView.as_view(), name=API_GAMELOG),
    path(
        "game/<int:pk>/setup",
        GameSetupCreateOrUpdateView.as_view(),
        name=API_GAME_SETUP,
    ),
    path(
        "game/<int:pk>/officials",
        GameOfficialCreateOrUpdateView.as_view(),
        name=API_GAME_OFFICIALS,
    ),
    path(
        "game/<int:pk>/halftime", GameHalftimeAPIView.as_view(), name=API_GAME_HALFTIME
    ),
    path(
        "game/<int:pk>/finalize",
        GameFinalizeUpdateView.as_view(),
        name=API_GAME_FINALIZE,
    ),
    path(
        "game/<int:pk>/possession",
        GamePossessionAPIView.as_view(),
        name=API_GAME_POSSESSION,
    ),
    path(
        "config/scorecard/penalties",
        ConfigPenalties.as_view(),
        name=API_CONFIG_SCORECARD_PENALTIES,
    ),
]
