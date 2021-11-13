from django.urls import path

from officials.api.views import OfficialsTeamListAPIView

API_OFFICIALS_FOR_TEAM = 'api-officials-for-team'

urlpatterns = [
    path('team/<int:pk>/list', OfficialsTeamListAPIView.as_view(), name=API_OFFICIALS_FOR_TEAM),
]
