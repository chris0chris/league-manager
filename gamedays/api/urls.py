from django.urls import path
from rest_framework.views import APIView

from gamedays.api.views import GamedayListAPIView, GameinfoUpdateAPIView, GamedayRetrieveUpdate, \
    GamedayCreateView, GamedayScheduleView, GameOfficialListCreateView, GameSetupCreateView, GameLogAPIView

urlpatterns = [
    path('gameday/list/', GamedayListAPIView.as_view(), name='api-gameday-list'),
    path('gameinfo/<int:pk>/', GameinfoUpdateAPIView.as_view(), name='api-gameinfo-retrieve-update'),
    path('gameday/<int:pk>/', GamedayRetrieveUpdate.as_view(), name='api-gameday-retrieve-update'),
    path('gameday/<int:pk>/details', GamedayScheduleView.as_view(), name='api-gameday-schedule'),
    path('gameday/create', GamedayCreateView.as_view(), name='api-gameday-create'),
    path('officials/create', GameOfficialListCreateView.as_view(), name='api-gameofficial-create'),
    path('gamesetup/<int:pk>/', APIView.as_view(), name='api-api-gamesetup'),
    path('gamesetup/create', GameSetupCreateView.as_view(), name='api-gamesetup-create'),
    path('gamelog/<int:id>', GameLogAPIView.as_view(), name='api-gamelog'),
]
