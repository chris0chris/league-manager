from django.urls import path

# importing API views
from passcheck.api.views import (PasscheckListAPIView,
                                 PasscheckRosterAPIView, PasscheckGamesAPIView)

# variables for API URLs
API_PASSCHECK_LIST = 'api-passcheck-list'
API_PASSCHECK_SERVICE = 'api-passcheck-service'
API_PASSCHECK_SERVICE_PLAYERS = 'api-passcheck-service-players'


# Mapping which URL connects to which view
urlpatterns = [
    path('list/', PasscheckListAPIView.as_view(), name=API_PASSCHECK_LIST),
    path('<str:token>/', PasscheckGamesAPIView.as_view(), name=API_PASSCHECK_SERVICE),
    path('roster/<str:team>/', PasscheckRosterAPIView.as_view(), name=API_PASSCHECK_SERVICE_PLAYERS),
]
