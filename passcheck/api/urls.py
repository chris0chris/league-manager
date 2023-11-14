from django.urls import path

# importing API views
from passcheck.api.views import PasscheckListAPIView

# variables for API URLs
API_PASSCHECK_LIST = 'api-passcheck-list'

# Mapping which URL connects to which view
urlpatterns = [
    path('list/', PasscheckListAPIView.as_view(), name=API_PASSCHECK_LIST),
]
