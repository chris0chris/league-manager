from django.urls import path

# import views
from .views import PasscheckListView, passcheck_view

# mapping urls to different views
urlpatterns = [
    path('', passcheck_view, name='passcheck-view'),
    path('list/', PasscheckListView.as_view(), name='passcheck-list'),
]
