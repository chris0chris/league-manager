from django.urls import path

from .views import PasscheckListView, passcheck_view

urlpatterns = [
    path('', passcheck_view, name='passcheck-view'),
    path('list/', PasscheckListView.as_view(), name='passcheck-list'),
]
