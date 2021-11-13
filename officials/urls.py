from django.urls import path

from officials.views import OfficialsTeamListView

OFFICIALS_LIST_FOR_TEAM = 'view-officials-list-for-team'

urlpatterns = [
    path('team/<int:pk>/list', OfficialsTeamListView.as_view(), name=OFFICIALS_LIST_FOR_TEAM),
    path('team/<int:pk>/list/<int:year>', OfficialsTeamListView.as_view(), name=OFFICIALS_LIST_FOR_TEAM),
]
