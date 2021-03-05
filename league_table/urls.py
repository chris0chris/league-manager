from django.urls import path

from league_table.views import OverallLeagueTableView

urlpatterns = [
    path('', OverallLeagueTableView.as_view(), name='league-table-overall'),
]
