from datetime import timedelta
from django.db.models import Prefetch, F, ExpressionWrapper, DurationField
from django.db.models.functions import Abs
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from gamedays.models import Gameday, Gameresult
from .progress_serializers import GamedayProgressSerializer


class GameProgressPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class GameProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for game progress dashboard.
    Returns gamedays within a configurable time window (-7 to +14 days from today)
    with all associated games and scores denormalized in the response.
    """

    serializer_class = GamedayProgressSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = GameProgressPagination
    filter_backends = [filters.OrderingFilter]
    # Default ordering surfaces the gamedays closest to "today" first (see
    # `distance_from_today` annotation) so today's games land on the first page
    # and aren't pushed off the end by the lookback window.
    ordering = ['distance_from_today', 'date']
    ordering_fields = ['date', 'name']

    def get_queryset(self):
        """
        Return gamedays within the progress dashboard window:
        - Past: 7 days ago
        - Future: 14 days from today

        Ordered by absolute distance from today (closest first) so the most
        relevant gamedays appear on page 1; ties break by date ascending.
        """
        today = timezone.now().date()
        start_date = today - timedelta(days=7)
        end_date = today + timedelta(days=14)

        queryset = Gameday.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
        ).exclude(
            status=Gameday.STATUS_DRAFT,
        ).annotate(
            distance_from_today=Abs(
                ExpressionWrapper(F('date') - today, output_field=DurationField())
            )
        )

        league = self.request.query_params.get('league')
        if league:
            queryset = queryset.filter(league__name__icontains=league)

        season = self.request.query_params.get('season')
        if season:
            queryset = queryset.filter(season__name__icontains=season)

        home_results_prefetch = Prefetch(
            'gameinfo_set__gameresult_set',
            queryset=Gameresult.objects.filter(isHome=True)
        )

        queryset = queryset.select_related(
            'league',
            'season',
        ).prefetch_related(
            'gameinfo_set',
            home_results_prefetch,
        )

        return queryset
