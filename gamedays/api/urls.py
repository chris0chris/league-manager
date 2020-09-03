from django.urls import path

from gamedays.api.views import GamedayListAPIView, GameinfoUpdateAPIView

urlpatterns = [
    path('list/', GamedayListAPIView.as_view(), name='api-gameday-list'),
    path('gameinfo/<int:pk>/', GameinfoUpdateAPIView.as_view(), name='api-gameinfo-retrieve-update')
]
