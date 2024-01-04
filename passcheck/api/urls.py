from django.urls import path

# importing API views
from passcheck.api.views import PasscheckListAPIView, PasscheckGameinfoAPIView

# variables for API URLs
API_PASSCHECK_LIST = 'api-passcheck-list'
API_GAMEINFO_LIST = 'api-gameinfo-list'

# Mapping which URL connects to which view
urlpatterns = [
    path('list/', PasscheckListAPIView.as_view(), name=API_PASSCHECK_LIST),
    path('list/gameinfo/<int:pk>/officials/<str:pk>/', PasscheckGameinfoAPIView.as_view(), name=API_GAMEINFO_LIST),
]
