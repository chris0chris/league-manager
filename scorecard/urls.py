from django.urls import path

from scorecard.views import ScorecardView, ScorecardViewDeprecated

urlpatterns = [
    path('', ScorecardView.as_view(), name='scorecard-home'),
    path('deprecated', ScorecardViewDeprecated.as_view(), name='scorecard-home'),
]
