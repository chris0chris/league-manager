from django.urls import path

from league_table.constants import (
    LEAGUE_TABLE_OVERALL_TABLE_BY_SLUG_AND_LEAGUE,
    LEAGUE_TABLE_OVERALL_TABLE_BY_LEAGUE,
)
from league_table.views import LeagueTableView, LeagueScheduleView

urlpatterns = [
    path('<str:league>/<str:season>/', LeagueTableView.as_view(), name=LEAGUE_TABLE_OVERALL_TABLE_BY_SLUG_AND_LEAGUE),
    path('<str:league>/', LeagueTableView.as_view(), name=LEAGUE_TABLE_OVERALL_TABLE_BY_LEAGUE),
    path('all-games/', LeagueScheduleView.as_view(), name='league-table-all-games'),
]
