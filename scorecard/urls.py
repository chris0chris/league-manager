from django.urls import path

from scorecard.views import ScorecardView

urlpatterns = [
    path('', ScorecardView.as_view(), name='scorecard-home'),
]
