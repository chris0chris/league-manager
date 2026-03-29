from django.urls import path

from liveticker.constants import LIVETICKER_HOME
from liveticker.views import LivetickerView

urlpatterns = [
    path("", LivetickerView.as_view(), name=LIVETICKER_HOME),
]
