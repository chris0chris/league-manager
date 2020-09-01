from django.urls import path

from gamedays.api.views import GamedayListAPIView

urlpatterns = [
    path('list/', GamedayListAPIView.as_view(), name='api-gameday-list'),
]
