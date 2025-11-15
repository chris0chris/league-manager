from django.urls import path

from league_table.views import LeagueTableView, LeagueScheduleView

urlpatterns = [
    path('<str:league>/<str:season>/', LeagueTableView.as_view(), name='league-table-league'),
    path('all-games/', LeagueScheduleView.as_view(), name='league-table-all-games'),
]
