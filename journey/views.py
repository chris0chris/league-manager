from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count
from django.http import HttpResponseForbidden
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin

from .models import Journey, JourneyEvent
from .serializers import JourneySerializer, JourneyEventSerializer

class JourneyEventViewSet(viewsets.ModelViewSet):
    serializer_class = JourneyEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = JourneyEvent.objects.all()

    def create(self, request, *args, **kwargs):
        """Create event and handle journey boundaries (login/inactivity)."""
        user = request.user
        event_name = request.data.get('event_name')
        metadata = request.data.get('metadata', {})

        # Get or create active journey
        journey = self._get_or_create_journey(user)

        # Create event
        event = JourneyEvent.objects.create(
            journey=journey,
            event_name=event_name,
            metadata=metadata
        )

        serializer = self.get_serializer(event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _get_or_create_journey(self, user):
        """Get active journey or create new one if inactive."""
        from django.conf import settings

        inactivity_minutes = getattr(settings, 'JOURNEY_INACTIVITY_MINUTES', 30)
        inactivity_threshold = timezone.now() - timedelta(minutes=inactivity_minutes)

        # Get the most recent journey
        active_journey = Journey.objects.filter(user=user, ended_at__isnull=True).first()

        if active_journey:
            # Check if the last event was recent
            last_event = active_journey.events.order_by('-created_at').first()
            if last_event and last_event.created_at < inactivity_threshold:
                # Journey is inactive, close it and create new one
                active_journey.ended_at = timezone.now()
                active_journey.save()
                return Journey.objects.create(user=user)
            return active_journey
        else:
            # No active journey, create one
            return Journey.objects.create(user=user)

    def get_queryset(self):
        """Filter events by user and optional journey."""
        qs = JourneyEvent.objects.filter(journey__user=self.request.user)
        journey_id = self.request.query_params.get('journey')
        if journey_id:
            qs = qs.filter(journey_id=journey_id)
        return qs.order_by('created_at')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return aggregate event counts for the last 7 days."""
        seven_days_ago = timezone.now() - timedelta(days=7)
        events = JourneyEvent.objects.filter(
            journey__user=request.user,
            created_at__gte=seven_days_ago
        )
        stats = events.values('event_name').annotate(count=Count('id')).order_by('-count')
        return Response({
            'stats': list(stats),
            'total_events': events.count(),
            'unique_event_types': len(list(stats)),
        })

class JourneyViewSet(viewsets.ModelViewSet):
    serializer_class = JourneySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Journey.objects.all()

    def get_queryset(self):
        """Filter journeys by authenticated user."""
        return Journey.objects.filter(user=self.request.user).order_by('-started_at')


class JourneyDashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'journey_dashboard/index.html'
    login_url = 'login'

    def dispatch(self, request, *args, **kwargs):
        """Check email authorization after login verification."""
        # LoginRequiredMixin.dispatch() will redirect unauthenticated users to login
        response = super().dispatch(request, *args, **kwargs)

        # Only check email authorization if user is authenticated
        # (dispatch will have already redirected if not)
        if request.user.is_authenticated and not self._is_authorized_user(request):
            return HttpResponseForbidden("You do not have access to this resource.")

        return response

    @staticmethod
    def _is_authorized_user(request):
        """
        Check if user is authenticated and is staff.

        Args:
            request: The HTTP request object

        Returns:
            True if user is authorized, False otherwise
        """
        return request.user.is_authenticated and request.user.is_staff
