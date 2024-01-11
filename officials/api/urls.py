from django.urls import path

from officials.api.views import OfficialsTeamListAPIView, OfficialsSearchName

API_OFFICIALS_FOR_TEAM = 'api-officials-for-team'
API_OFFICIALS_SEARCH_BY_NAME = 'api-officials-search-by-name'

urlpatterns = [
    path('team/<int:pk>/list', OfficialsTeamListAPIView.as_view(), name=API_OFFICIALS_FOR_TEAM),
    path('search/exclude/team/<int:pk>/list', OfficialsSearchName.as_view(), name=API_OFFICIALS_SEARCH_BY_NAME),
]
