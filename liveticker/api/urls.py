from django.urls import path

from liveticker.api.views import LivetickerAPIView

API_LIVETICKER_ALL = 'api-liveticker'

urlpatterns = [
    path('', LivetickerAPIView.as_view(), name=API_LIVETICKER_ALL),
]
