from django.conf.urls.static import static
from django.urls import path

from league_manager import settings
from scorecard.views import ScorecardSelectView

urlpatterns = [
    path('', ScorecardSelectView.as_view(), name='scorecard-home'),
    path('select/', ScorecardSelectView.as_view(), name='scorecard-select'),
]
