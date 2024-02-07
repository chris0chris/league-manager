from django.urls import path

# import views
from .views import PasscheckListView, PlayerlistCreateView, PlayerlistView, PasscheckView

PASSCHECK_ROSTER_CREATE = 'passcheck-roster-create'

# mapping urls to different views
urlpatterns = [
    path('', PasscheckView.as_view(), name='passcheck-view'),
    path('list/', PasscheckListView.as_view(), name='passcheck-list'),
    path('roster/create', PlayerlistCreateView.as_view(), name=PASSCHECK_ROSTER_CREATE),
    path('roster/<int:team>/list', PlayerlistView.as_view(), name=PASSCHECK_ROSTER_CREATE),
]
