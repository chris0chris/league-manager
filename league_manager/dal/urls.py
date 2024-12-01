from django.urls import path

from league_manager.dal.views import TeamAutocompleteView

DAL_TEAM_AUTOCOMPLETE = 'dal-team-autocomplete'

urlpatterns = [
    path('team', TeamAutocompleteView.as_view(), name=DAL_TEAM_AUTOCOMPLETE),
]