from django.urls import path

# import views
from .views import PasscheckListView, passcheck_view, PlayerlistCreateView, PlayerlistView

PASSCHECK_ROSTER_CREATE = 'passcheck-roster-create'

# mapping urls to different views
urlpatterns = [
    path('', passcheck_view, name='passcheck-view'),
    path('list/', PasscheckListView.as_view(), name='passcheck-list'),
    path('roster/create', PlayerlistCreateView.as_view(), name=PASSCHECK_ROSTER_CREATE),
    path('roster/<int:team>/list', PlayerlistView.as_view(), name=PASSCHECK_ROSTER_CREATE),
]
