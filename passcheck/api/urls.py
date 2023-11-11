from django.urls import path

from passcheck.api.views import PasscheckListAPIView

API_PASSCHECK_LIST = 'api-passcheck-list'

urlpatterns = [
    path('list/', PasscheckListAPIView.as_view(), name=API_PASSCHECK_LIST),
]