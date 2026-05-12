from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JourneyEventViewSet, JourneyViewSet, JourneyDashboardView

router = DefaultRouter()
router.register(r'events', JourneyEventViewSet, basename='event')
router.register(r'journeys', JourneyViewSet, basename='journey')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', JourneyDashboardView.as_view(), name='journey-dashboard'),
]
