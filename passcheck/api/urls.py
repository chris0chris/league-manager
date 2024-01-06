from django.urls import path

# importing API views
from passcheck.api.views import (PasscheckListAPIView,
PasscheckServicePlayersAPIView, PasscheckServiceAPIView)

# variables for API URLs
API_PASSCHECK_LIST = 'api-passcheck-list'
API_PASSCHECK_SERVICE = 'api-passcheck-service'
API_PASSCHECK_SERVICE_PLAYERS = 'api-passcheck-service-players'


# Mapping which URL connects to which view
urlpatterns = [
    path('list/', PasscheckListAPIView.as_view(), name=API_PASSCHECK_LIST),
    path('<str:token>/', PasscheckServiceAPIView.as_view(), name=API_PASSCHECK_SERVICE),
    path('players/<str:team>/', PasscheckServicePlayersAPIView.as_view(), name=API_PASSCHECK_SERVICE_PLAYERS),
]
