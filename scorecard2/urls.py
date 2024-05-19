from django.urls import path

from scorecard2.views import ScorecardView

urlpatterns = [
    path('', ScorecardView.as_view(), name='scorecard-home'),
]
