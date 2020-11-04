from django.urls import path

from scorecard.views import ScorecardView, ScorecardTestView

urlpatterns = [
    path('', ScorecardView.as_view(), name='scorecard-home'),
    path('test/', ScorecardTestView.as_view(), name='scorecard-test')
]
