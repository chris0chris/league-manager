from django.urls import path

from liveticker.views import LivetickerView

urlpatterns = [
    path('', LivetickerView.as_view(), name='liveticker-home'),
]
