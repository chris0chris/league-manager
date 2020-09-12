from django.urls import path

from gamedays.api.views import GamedayListAPIView, GameinfoUpdateAPIView, GamedayRetrieveUpdate, \
    GamedayCreateView, GamedayScheduleView

urlpatterns = [
    path('gameday/list/', GamedayListAPIView.as_view(), name='api-gameday-list'),
    path('gameinfo/<int:pk>/', GameinfoUpdateAPIView.as_view(), name='api-gameinfo-retrieve-update'),
    path('gameday/<int:pk>/', GamedayRetrieveUpdate.as_view(), name='api-gameday-retrieve-update'),
    path('gameday/<int:pk>/schedule', GamedayScheduleView.as_view(), name='api-gameday-schedule'),
    path('gameday/create', GamedayCreateView.as_view(), name='api-gameday-create'),
]
