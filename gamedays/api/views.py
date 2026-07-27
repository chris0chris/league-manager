import json
import hashlib
import logging
from collections import OrderedDict
from datetime import datetime

from django.conf import settings
from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from django.views.decorators.http import condition
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.permissions import IsAuthenticatedOrOwnerOrStaff, IsAuthenticatedOrGamedayOwnerOrStaff

from gamedays.api.serializers import (
    GamedaySerializer,
    GamedayListSerializer,
    GameinfoSerializer,
    GameOfficialSerializer,
    SeasonSerializer,
    LeagueSerializer,
)
from gamedays.models import (
    Gameday,
    Gameinfo,
    GameOfficial,
    Season,
    League,
    Gameresult,
    GamedayDesignerState,
    TeamLog,
)
from gamedays.serializers.game_results import (
    GameResultsUpdateSerializer,
    GameInfoSerializer,
)
from gamedays.service.auto_assign_officials_service import (
    AutoAssignOfficialsError,
    AutoAssignOfficialsService,
)
from gamedays.service.gameday_service import (
    GamedayService,
    TABLE_HEADERS,
    HtmlAndJsonRendering,
)
from gamedays.service.gameday_settings import (
    TEAM_DESCRIPTION,
    PF,
    PA,
    DIFF,
    STANDING,
    WIN_POINTS,
)

logger = logging.getLogger(__name__)


def _check_gameday_mutation_permission(request, gameday) -> bool:
    """Return True if user is staff or the gameday's author.

    Delegates to IsAuthenticatedOrOwnerOrStaff so plain APIViews (which never
    trigger DRF's automatic has_object_permission check) share one definition
    of the ownership rule with the generic/viewset-based views.
    """
    return IsAuthenticatedOrOwnerOrStaff().has_object_permission(request, None, gameday)


def generate_gameday_list_etag(request):
    """Generate ETag for gameday list based on query parameters and gameday state.

    Must change whenever the list response would change: a new/deleted gameday
    (count), or a field edit on an existing one -- name, status, league, season,
    etc. (max updated_at). The pk of the newest row alone doesn't cover that last
    case: publishing gameday N doesn't create a new row, so the pk-only ETag
    stayed identical across the publish and clients kept serving their
    pre-publish cached body via a stale 304.
    """
    # Include query parameters in ETag
    etag_data = request.GET.urlencode() or "all"

    aggregate = Gameday.objects.aggregate(
        count=Count("pk"), latest_update=Max("updated_at")
    )
    etag_data += f":{aggregate['count']}:{aggregate['latest_update']}"

    return f'"{hashlib.md5(etag_data.encode()).hexdigest()}"'


def generate_gameday_games_etag(request, gameday_pk=None):
    """Generate ETag for gameday games list based on latest gameresult."""
    try:
        gameday = Gameday.objects.get(pk=gameday_pk)
        # Include gameday pk and latest gameresult pk
        latest_result = Gameresult.objects.filter(
            gameinfo__gameday=gameday
        ).values_list('pk', flat=True).order_by('-pk').first()

        etag_data = f"{gameday_pk}:{latest_result or 'no-results'}"
        return f'"{hashlib.md5(etag_data.encode()).hexdigest()}"'
    except Gameday.DoesNotExist:
        return '""'


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000


class GamedayViewSet(viewsets.ModelViewSet):
    serializer_class = GamedaySerializer
    pagination_class = StandardResultsSetPagination
    queryset = Gameday.objects.all()
    permission_classes = [AllowAny]

    # Reads stay public (public gameday pages / dashboards); mutating a gameday
    # — including its resource URLs, which render on gameday pages — requires an
    # authenticated user to prevent anonymous tampering / link injection.
    WRITE_ACTIONS = ("create", "update", "partial_update", "destroy", "publish", "designer_state")

    def get_permissions(self):
        if self.action in self.WRITE_ACTIONS:
            return [IsAuthenticatedOrOwnerOrStaff()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.action == "list":
            return GamedayListSerializer
        return GamedaySerializer

    @method_decorator(condition(etag_func=generate_gameday_list_etag))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != Gameday.STATUS_DRAFT:
            return Response(
                {
                    "detail": "Published gamedays cannot be deleted. Please unlock the gameday first."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        # Unlocking (-> DRAFT) is what enables a destructive re-publish. Refuse it
        # when the gameday already has entered results so those cannot be wiped.
        instance = self.get_object()
        new_status = request.data.get("status")
        if (
            instance.status != Gameday.STATUS_DRAFT
            and new_status == Gameday.STATUS_DRAFT
            and instance.has_entered_results()
        ):
            return Response(
                {
                    "detail": (
                        "Cannot unlock: this gameday already has entered game "
                        "results. Unlocking would allow the schedule to be "
                        "regenerated and delete them. Clear the results first if "
                        "you really need to unlock."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )
        return super().update(request, *args, **kwargs)

    def get_queryset(self):
        queryset = (
            Gameday.objects.all()
            .select_related("season", "league", "author", "designer_state")
            .order_by("date", "name")
        )
        search = self.request.query_params.get("search", "")
        if search:
            if ":" in search:
                key, value = search.split(":", 1)
                key = key.lower().strip()
                value = value.strip()
                if key == "season":
                    queryset = queryset.filter(season__name__icontains=value)
                elif key == "status":
                    queryset = queryset.filter(status__iexact=value)
            else:
                queryset = queryset.filter(name__icontains=search)
        has_designer_state = self.request.query_params.get("has_designer_state")
        if has_designer_state is not None:
            wants_state = has_designer_state.lower() in ("true", "1", "yes")
            queryset = queryset.filter(designer_state__isnull=not wants_state)
        return queryset

    @staticmethod
    def _has_entered_results(gameday) -> bool:
        """True if the gameday holds played-game data that regenerating the schedule
        would destroy. Delegates to the model so publish, unlock and the serialized
        ``has_results`` flag all share one definition."""
        return gameday.has_entered_results()

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        gameday = self.get_object()
        if gameday.status != Gameday.STATUS_DRAFT:
            return Response(
                {"detail": "Gameday is already published or completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if self._has_entered_results(gameday):
            return Response(
                {
                    "detail": (
                        "Cannot re-publish: this gameday already has entered game "
                        "results. Re-publishing regenerates the schedule and would "
                        "delete them. Clear the results first if you really need to "
                        "regenerate."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        from django.utils import timezone
        from gamedays.service.canvas_publish_service import CanvasPublishService

        gameday.status = Gameday.STATUS_PUBLISHED
        gameday.published_at = timezone.now()
        gameday.save()

        CanvasPublishService(gameday).apply()

        return Response(GamedaySerializer(gameday).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "put"], url_path="designer-state")
    def designer_state(self, request, pk=None):
        gameday = self.get_object()
        if request.method == "GET":
            state, created = GamedayDesignerState.objects.get_or_create(gameday=gameday)
            state_data = dict(state.state_data) if state.state_data else {}
            metadata = state_data.get("metadata")
            has_results = gameday.has_entered_results()
            if isinstance(metadata, dict):
                state_data["metadata"] = {
                    **metadata,
                    "status": gameday.status,
                    "has_results": has_results,
                }
            else:
                state_data["metadata"] = {
                    "name": gameday.name,
                    "date": str(gameday.date) if gameday.date else "",
                    "start": str(gameday.start) if gameday.start else "",
                    "address": gameday.address or "",
                    "season": gameday.season_id,
                    "league": gameday.league_id,
                    "status": gameday.status,
                    "has_results": has_results,
                }
            return Response({"state_data": state_data})

        if request.method == "PUT":
            state, created = GamedayDesignerState.objects.get_or_create(gameday=gameday)
            state.state_data = request.data.get("state_data", {})
            state.last_modified_by = request.user
            state.save()

            metadata = state.state_data.get("metadata", {})
            update_fields = []
            for field in ("name", "date", "start", "address"):
                value = metadata.get(field)
                if value is not None and value != "" and getattr(gameday, field) != value:
                    setattr(gameday, field, value)
                    update_fields.append(field)
            # league/season are FKs: read/write the *_id attname directly so we
            # compare and assign raw pks without loading the related objects.
            # 0 is the designer's not-yet-loaded placeholder, not a real pk --
            # skip it rather than pointing the gameday at a nonexistent row.
            for field, attname in (("season", "season_id"), ("league", "league_id")):
                value = metadata.get(field)
                if value and getattr(gameday, attname) != value:
                    setattr(gameday, attname, value)
                    update_fields.append(attname)
            if update_fields:
                gameday.save(update_fields=update_fields)

            return Response({"state_data": state.state_data})


class GamedayListAPIView(ListAPIView):
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.all()

    @method_decorator(condition(etag_func=generate_gameday_list_etag))
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Gameday.objects.select_related('league', 'season', 'author')
        if settings.DEBUG:
            return queryset.filter(date=settings.DEBUG_DATE)
        return queryset.filter(date=datetime.today())


class GameinfoUpdateAPIView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticatedOrGamedayOwnerOrStaff]
    serializer_class = GameinfoSerializer
    queryset = Gameinfo.objects.prefetch_related('gameresult_set').all()


class GamedayRetrieveUpdate(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticatedOrOwnerOrStaff]
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.select_related('league', 'season', 'author').all()


class GameOfficialCreateOrUpdateView(RetrieveUpdateAPIView):
    # Deliberately no staff/gameday-author gate here (unlike other mutating
    # views in this file): officials are assigned on-site by whichever
    # team/crew is running the scorecard for that specific game, not
    # necessarily the gameday's staff or author. Bare IsAuthenticatedOrReadOnly
    # (the DRF default) matches the sibling GameSetupCreateOrUpdateView, which
    # sets gameStarted via the same "Spiel starten" submit — see #1634.
    serializer_class = GameOfficialSerializer
    queryset = GameOfficial.objects.all()

    def get(self, request, *args, **kwargs):
        game_id = kwargs.get("pk")
        try:
            officials = GameOfficial.objects.filter(gameinfo_id=game_id)
            serializer = GameOfficialSerializer(instance=officials, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except GameOfficial.DoesNotExist:
            raise NotFound(detail=f"No officials found for gameId {game_id}")

    def update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        get_object_or_404(Gameinfo, pk=pk)

        response_data = []
        for item in request.data:
            official, _ = GameOfficial.objects.get_or_create(
                gameinfo_id=pk, position=item["position"]
            )
            serializer = GameOfficialSerializer(instance=official, data=item)
            if serializer.is_valid():
                serializer.save()
                response_data.append(serializer.data)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(response_data, status=status.HTTP_200_OK)


class GamedayScheduleView(APIView):
    # noinspection PyMethodMayBeStatic
    def get(self, request: Request, *args, **kwargs):
        gs = GamedayService.create(kwargs["pk"])
        get = request.query_params.get("get")
        response = '{"error": "Please use parameter - get "}'
        orient = request.query_params.get("orient")
        orient = "index" if orient is None else orient
        if get == "schedule":
            response = gs.get_schedule().to_json(orient=orient)
        elif get == "qualify":
            qualify_table = gs.get_qualify_table()
            if not isinstance(qualify_table, HtmlAndJsonRendering):
                qualify_table = qualify_table[[STANDING, TEAM_DESCRIPTION, WIN_POINTS, PF, PA, DIFF]]
                qualify_table = qualify_table.rename(columns=TABLE_HEADERS)
            response = qualify_table.to_json(orient="split")
        elif get == "final":
            final_table = gs.get_final_table()
            if not isinstance(final_table, HtmlAndJsonRendering):
                final_table = final_table[[TEAM_DESCRIPTION, WIN_POINTS, PF, PA, DIFF]]
                final_table = final_table.rename(columns=TABLE_HEADERS)
            response = final_table.to_json(orient="split")
        return Response(json.loads(response, object_pairs_hook=OrderedDict))


class GamedayCreateView(CreateAPIView):
    serializer_class = GamedaySerializer


class GamedayPublishAPIView(APIView):
    permission_classes = [IsAuthenticatedOrOwnerOrStaff]

    def post(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        gameday = get_object_or_404(Gameday, pk=pk)

        if not _check_gameday_mutation_permission(request, gameday):
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        if gameday.status != Gameday.STATUS_DRAFT:
            return Response(
                {"detail": "Gameday is already published or completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone

        gameday.status = Gameday.STATUS_PUBLISHED
        gameday.published_at = timezone.now()
        gameday.save()

        return Response(GamedaySerializer(gameday).data, status=status.HTTP_200_OK)


class GameResultUpdateAPIView(APIView):
    permission_classes = [IsAuthenticatedOrGamedayOwnerOrStaff]

    def patch(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        game = get_object_or_404(Gameinfo, pk=pk)

        if not _check_gameday_mutation_permission(request, game.gameday):
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        halftime_score = request.data.get("halftime_score")
        final_score = request.data.get("final_score")

        if halftime_score is not None:
            if game.status == Gameinfo.STATUS_PUBLISHED or game.status == "Geplant":
                game.status = Gameinfo.STATUS_IN_PROGRESS
            # Sync to Gameresult records
            Gameresult.objects.filter(gameinfo=game, isHome=True).update(
                fh=halftime_score.get("home")
            )
            Gameresult.objects.filter(gameinfo=game, isHome=False).update(
                fh=halftime_score.get("away")
            )

        if final_score is not None:
            game.status = Gameinfo.STATUS_COMPLETED
            # Sync to Gameresult records
            # Final score in JSON is total, in Gameresult it's sh (since fh is already set)
            home_res = Gameresult.objects.filter(gameinfo=game, isHome=True).first()
            away_res = Gameresult.objects.filter(gameinfo=game, isHome=False).first()

            home_fh = (
                halftime_score.get("home", 0)
                if halftime_score
                else (home_res.fh if home_res else 0)
            )
            away_fh = (
                halftime_score.get("away", 0)
                if halftime_score
                else (away_res.fh if away_res else 0)
            )

            Gameresult.objects.filter(gameinfo=game, isHome=True).update(
                fh=home_fh, sh=final_score.get("home", 0) - (home_fh or 0)
            )
            Gameresult.objects.filter(gameinfo=game, isHome=False).update(
                fh=away_fh, sh=final_score.get("away", 0) - (away_fh or 0)
            )

        game.save()

        # Update gameday status
        gameday = game.gameday
        if gameday.status == Gameday.STATUS_PUBLISHED:
            gameday.status = Gameday.STATUS_IN_PROGRESS
            gameday.save()

        # Check if all games are completed
        all_games = Gameinfo.objects.filter(gameday=gameday)
        if all(g.status == Gameinfo.STATUS_COMPLETED for g in all_games):
            gameday.status = Gameday.STATUS_COMPLETED
            gameday.save()

        return Response(GameinfoSerializer(game).data, status=status.HTTP_200_OK)


class SeasonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Season.objects.all().order_by("-name")
    serializer_class = SeasonSerializer
    pagination_class = None


class LeagueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = League.objects.all().order_by("name")
    serializer_class = LeagueSerializer
    pagination_class = None


class GameResultsListView(APIView):
    """Get all games for a gameday"""

    @method_decorator(condition(etag_func=lambda request, gameday_pk=None: generate_gameday_games_etag(request, gameday_pk)))
    def get(self, request, gameday_pk=None):
        """GET /api/gamedays/{gameday_id}/games/"""
        try:
            gameday = Gameday.objects.get(pk=gameday_pk)
        except Gameday.DoesNotExist:
            return Response(
                {"error": "Gameday not found"}, status=status.HTTP_404_NOT_FOUND
            )

        games = Gameinfo.objects.filter(gameday=gameday).prefetch_related(
            'gameresult_set__team'
        )
        serializer = GameInfoSerializer(games, many=True)
        return Response(serializer.data)


class AutoAssignOfficialsView(APIView):
    permission_classes = [IsAuthenticatedOrOwnerOrStaff]

    def post(self, request, pk):
        gameday = get_object_or_404(Gameday, pk=pk)

        if not _check_gameday_mutation_permission(request, gameday):
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        if gameday.status != "DRAFT":
            return Response(
                {"error": "Gameday must be in DRAFT status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            service = AutoAssignOfficialsService(pk)
            assignments = service.assign()
            return Response(
                {"assigned_count": len(assignments), "assignments": assignments}
            )
        except AutoAssignOfficialsError as e:
            logger.warning("Auto-assign officials failed for gameday %s: %s", pk, e)
            return Response(
                {"error": "Unable to auto-assign officials for this gameday."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GameResultsUpdateView(APIView):
    """Update game results for a specific game"""
    permission_classes = [IsAuthenticatedOrGamedayOwnerOrStaff]

    def post(self, request, gameday_pk=None, game_pk=None):
        """POST /api/gamedays/{gameday_id}/games/{game_id}/results/"""
        try:
            game = Gameinfo.objects.get(pk=game_pk, gameday_id=gameday_pk)
        except Gameinfo.DoesNotExist:
            return Response(
                {"error": "Game not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if not _check_gameday_mutation_permission(request, game.gameday):
            return Response({"detail": "You do not have permission to perform this action."}, status=status.HTTP_403_FORBIDDEN)

        serializer = GameResultsUpdateSerializer(game, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
