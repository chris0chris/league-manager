from django.urls import path

from scorecard.views import ScorecardSelectView

urlpatterns = [
    path('', ScorecardSelectView.as_view(), name='scorecard-home'),
    path('select/', ScorecardSelectView.as_view(), name='scorecard-select'),
]
