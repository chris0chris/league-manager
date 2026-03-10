import json
from collections import OrderedDict
from datetime import datetime

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView, CreateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import (
    GamedaySerializer,
    GamedayListSerializer,
    GameinfoSerializer,
    GameOfficialSerializer,
    SeasonSerializer,
    LeagueSerializer,
)
from gamedays.serializers.game_results import (
    GameResultsUpdateSerializer,
    GameInfoSerializer,
)
from gamedays.models import Gameday, Gameinfo, GameOfficial, Season, League, Gameresult
from gamedays.service.gameday_service import GamedayService


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000


class GamedayViewSet(viewsets.ModelViewSet):
    serializer_class = GamedaySerializer
    pagination_class = StandardResultsSetPagination
    queryset = Gameday.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == "list":
            return GamedayListSerializer
        return GamedaySerializer

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

    def get_queryset(self):
        queryset = (
            Gameday.objects.all()
            .select_related("season", "league", "author", "designer_state")
            .order_by("-date")
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
        return queryset

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        gameday = self.get_object()
        if gameday.status != Gameday.STATUS_DRAFT:
            return Response(
                {"detail": "Gameday is already published or completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Read from new model (allow empty if no designer state exists)
        designer_data = {}
        if hasattr(gameday, "designer_state"):
            designer_data = gameday.designer_state.state_data or {}

        from django.utils import timezone
        from gamedays.models import Team

        gameday.status = Gameday.STATUS_PUBLISHED
        gameday.published_at = timezone.now()
        gameday.save()

        # Sync designer data to Gameinfo and Gameresult models
        nodes = designer_data.get("nodes", [])
        global_teams = designer_data.get("globalTeams", [])

        # 1. Map Designer UUIDs to Database Team IDs
        team_uuid_to_id = {}
        for team_data in global_teams:
            label = team_data.get("label")
            uuid = team_data.get("id")
            if not label or not uuid:
                continue
            team, _ = Team.objects.get_or_create(
                name=label, defaults={"description": label}
            )
            team_uuid_to_id[uuid] = team.id

        # Pre-map stages and fields for quick resolution
        stage_map = {n.get("id"): n for n in nodes if n.get("type") == "stage"}
        field_map = {n.get("id"): n for n in nodes if n.get("type") == "field"}

        def resolve_team(team_ref):
            if not team_ref:
                return None

            # Handle TeamReference object (dict)
            if isinstance(team_ref, dict):
                ref_type = team_ref.get("type")
                name = (
                    team_ref.get("name")
                    or team_ref.get("matchName")
                    or team_ref.get("stageName")
                )
                if not name:
                    return None

                # Check if name is a UUID in our map
                real_id = team_uuid_to_id.get(str(name), None)
                if real_id:
                    try:
                        return Team.objects.get(pk=real_id)
                    except Team.DoesNotExist:
                        pass

                # If it's a static reference or we have a name, try finding by name or create
                team, _ = Team.objects.get_or_create(
                    name=str(name), defaults={"description": str(name)}
                )
                return team

            # Handle string (UUID or Name)
            if isinstance(team_ref, str):
                real_id = team_uuid_to_id.get(team_ref, team_ref)
                try:
                    return Team.objects.get(pk=real_id)
                except (Team.DoesNotExist, ValueError):
                    # Try by name or create
                    team, _ = Team.objects.get_or_create(
                        name=team_ref, defaults={"description": team_ref}
                    )
                    return team

            return None

        # 2. Create/Update Gameinfo objects from designer nodes
        id_mapping = {}
        for node in nodes:
            if node.get("type") == "game":
                node_id = node.get("id")
                node_data = node.get("data", {})

                db_id = None
                if isinstance(node_id, str) and "-" in node_id:
                    parts = node_id.split("-")
                    last_part = parts[-1]
                    if last_part.isdigit():
                        db_id = int(last_part)

                official_team = resolve_team(node_data.get("official"))

                # Fallback for officials if still None (DB requires NOT NULL)
                if official_team is None:
                    official_team, _ = Team.objects.get_or_create(
                        name="Team Officials",
                        defaults={"description": "Default Officials Team"},
                    )

                # Resolve Field and Stage from hierarchy or legacy fieldId
                field_number = 1
                stage_name = (
                    node_data.get("stageName") or node_data.get("stage") or "Standard"
                )

                # 1. Try legacy fieldId first
                target_field_id = node_data.get("fieldId")

                # 2. Try hierarchy for stage name and field resolution
                parent_id = node.get("parentId")
                if parent_id in stage_map:
                    stage_node = stage_map[parent_id]
                    stage_data = stage_node.get("data", {})
                    stage_name = stage_data.get("name") or stage_name
                    if not target_field_id:
                        target_field_id = stage_node.get("parentId")

                # 3. Resolve field number from field_id
                if target_field_id in field_map:
                    field_node = field_map[target_field_id]
                    field_data = field_node.get("data", {})
                    # Try to get field number from order or name
                    field_number = field_data.get("order", 0) + 1
                    name = field_data.get("name", "")
                    if "Feld" in name:
                        try:
                            field_number = int(name.split(" ")[-1])
                        except (ValueError, IndexError):
                            pass

                gameinfo_defaults = {
                    "scheduled": node_data.get("startTime", "10:00"),
                    "field": field_number,
                    "stage": stage_name,
                    "standing": node_data.get("standing", "Game"),
                    "officials": official_team,
                    "status": Gameinfo.STATUS_PUBLISHED,
                }

                gameinfo = None
                if db_id:
                    gameinfo = Gameinfo.objects.filter(
                        pk=db_id, gameday=gameday
                    ).first()

                if gameinfo:
                    for key, value in gameinfo_defaults.items():
                        setattr(gameinfo, key, value)
                    gameinfo.save()
                else:
                    gameinfo = Gameinfo.objects.create(
                        gameday=gameday, **gameinfo_defaults
                    )
                    old_id = node.get("id")
                    new_id = f"game-{gameinfo.pk}"
                    node["id"] = new_id
                    if old_id:
                        id_mapping[old_id] = new_id

                for is_home in [True, False]:
                    node_team_id = node_data.get(
                        "homeTeamId" if is_home else "awayTeamId"
                    )
                    team = None
                    if node_team_id:
                        real_id = team_uuid_to_id.get(node_team_id, node_team_id)
                        try:
                            team = Team.objects.get(pk=real_id)
                        except (Team.DoesNotExist, ValueError):
                            pass

                    res_defaults = {"team": team}
                    scores = node_data.get("halftime_score")
                    final = node_data.get("final_score")
                    if scores:
                        res_defaults["fh"] = scores.get("home" if is_home else "away")
                    if final:
                        fh = (
                            (
                                res_defaults.get("fh")
                                or scores.get("home" if is_home else "away")
                                or 0
                            )
                            if scores
                            else 0
                        )
                        final_val = final.get("home" if is_home else "away", 0)
                        res_defaults["sh"] = final_val - fh

                    Gameresult.objects.update_or_create(
                        gameinfo=gameinfo, isHome=is_home, defaults=res_defaults
                    )

        # Update edges and parent IDs with mapped IDs to maintain integrity
        if id_mapping:
            edges = designer_data.get("edges", [])
            for edge in edges:
                if edge.get("source") in id_mapping:
                    edge["source"] = id_mapping[edge["source"]]
                if edge.get("target") in id_mapping:
                    edge["target"] = id_mapping[edge["target"]]

            for node in nodes:
                if node.get("parentId") in id_mapping:
                    node["parentId"] = id_mapping[node["parentId"]]

        # Save updated designer_data back to the new model (if it exists)
        if hasattr(gameday, "designer_state"):
            gameday.designer_state.state_data = designer_data
            gameday.designer_state.save()

        return Response(GamedaySerializer(gameday).data, status=status.HTTP_200_OK)


class GamedayListAPIView(ListAPIView):
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.all()

    def get_queryset(self):
        if settings.DEBUG:
            return Gameday.objects.filter(date=settings.DEBUG_DATE)
        return Gameday.objects.filter(date=datetime.today())


class GameinfoUpdateAPIView(RetrieveUpdateAPIView):
    serializer_class = GameinfoSerializer
    queryset = Gameinfo.objects.all()


class GamedayRetrieveUpdate(RetrieveUpdateAPIView):
    serializer_class = GamedaySerializer
    queryset = Gameday.objects.all()


class GameOfficialCreateOrUpdateView(RetrieveUpdateAPIView):
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
            response = gs.get_qualify_table().to_json(orient="split")
        elif get == "final":
            response = gs.get_final_table().to_json(orient="split")
        return Response(json.loads(response, object_pairs_hook=OrderedDict))


class GamedayCreateView(CreateAPIView):
    serializer_class = GamedaySerializer


class GamedayPublishAPIView(APIView):
    def post(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        gameday = get_object_or_404(Gameday, pk=pk)

        if gameday.status != Gameday.STATUS_DRAFT:
            return Response(
                {"detail": "Gameday is already published or completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone
        from gamedays.models import Team

        gameday.status = Gameday.STATUS_PUBLISHED
        gameday.published_at = timezone.now()
        gameday.save()

        # Sync designer data to Gameinfo and Gameresult models
        designer_data = {}
        if hasattr(gameday, "designer_state"):
            designer_data = gameday.designer_state.state_data or {}
        nodes = designer_data.get("nodes", [])
        global_teams = designer_data.get("globalTeams", [])

        # 1. Map Designer UUIDs to Database Team IDs
        team_uuid_to_id = {}
        for team_data in global_teams:
            label = team_data.get("label")
            uuid = team_data.get("id")
            if not label or not uuid:
                continue
            team, _ = Team.objects.get_or_create(
                name=label, defaults={"description": label}
            )
            team_uuid_to_id[uuid] = team.id

        # Pre-map stages and fields for quick resolution
        stage_map = {n.get("id"): n for n in nodes if n.get("type") == "stage"}
        field_map = {n.get("id"): n for n in nodes if n.get("type") == "field"}

        def resolve_team(team_ref):
            if not team_ref:
                return None

            # Handle TeamReference object (dict)
            if isinstance(team_ref, dict):
                ref_type = team_ref.get("type")
                name = (
                    team_ref.get("name")
                    or team_ref.get("matchName")
                    or team_ref.get("stageName")
                )
                if not name:
                    return None

                # Check if name is a UUID in our map
                real_id = team_uuid_to_id.get(str(name), None)
                if real_id:
                    try:
                        return Team.objects.get(pk=real_id)
                    except Team.DoesNotExist:
                        pass

                # If it's a static reference or we have a name, try finding by name or create
                team, _ = Team.objects.get_or_create(
                    name=str(name), defaults={"description": str(name)}
                )
                return team

            # Handle string (UUID or Name)
            if isinstance(team_ref, str):
                real_id = team_uuid_to_id.get(team_ref, team_ref)
                try:
                    return Team.objects.get(pk=real_id)
                except (Team.DoesNotExist, ValueError):
                    # Try by name or create
                    team, _ = Team.objects.get_or_create(
                        name=team_ref, defaults={"description": team_ref}
                    )
                    return team

            return None

        # 2. Create/Update Gameinfo objects from designer nodes
        for node in nodes:
            if node.get("type") == "game":
                node_id = node.get("id")
                node_data = node.get("data", {})

                db_id = None
                if isinstance(node_id, str) and "-" in node_id:
                    parts = node_id.split("-")
                    last_part = parts[-1]
                    if last_part.isdigit():
                        db_id = int(last_part)

                official_team = resolve_team(node_data.get("official"))

                # Fallback for officials if still None (DB requires NOT NULL)
                if official_team is None:
                    official_team, _ = Team.objects.get_or_create(
                        name="Team Officials",
                        defaults={"description": "Default Officials Team"},
                    )

                # Resolve Field and Stage from hierarchy or legacy fieldId
                field_number = 1
                stage_name = (
                    node_data.get("stageName") or node_data.get("stage") or "Standard"
                )

                # 1. Try legacy fieldId first
                target_field_id = node_data.get("fieldId")

                # 2. Try hierarchy for stage name and field resolution
                parent_id = node.get("parentId")
                if parent_id in stage_map:
                    stage_node = stage_map[parent_id]
                    stage_data = stage_node.get("data", {})
                    stage_name = stage_data.get("name") or stage_name
                    if not target_field_id:
                        target_field_id = stage_node.get("parentId")

                # 3. Resolve field number from field_id
                if target_field_id in field_map:
                    field_node = field_map[target_field_id]
                    field_data = field_node.get("data", {})
                    # Try to get field number from order or name
                    field_number = field_data.get("order", 0) + 1
                    name = field_data.get("name", "")
                    if "Feld" in name:
                        try:
                            field_number = int(name.split(" ")[-1])
                        except (ValueError, IndexError):
                            pass

                gameinfo_defaults = {
                    "scheduled": node_data.get("startTime", "10:00"),
                    "field": field_number,
                    "stage": stage_name,
                    "standing": node_data.get("standing", "Game"),
                    "officials": official_team,
                    "status": Gameinfo.STATUS_PUBLISHED,
                }

                gameinfo = None
                if db_id:
                    gameinfo = Gameinfo.objects.filter(
                        pk=db_id, gameday=gameday
                    ).first()

                if gameinfo:
                    for key, value in gameinfo_defaults.items():
                        setattr(gameinfo, key, value)
                    gameinfo.save()
                else:
                    gameinfo = Gameinfo.objects.create(
                        gameday=gameday, **gameinfo_defaults
                    )
                    node["id"] = f"game-{gameinfo.pk}"

                for is_home in [True, False]:
                    node_team_id = node_data.get(
                        "homeTeamId" if is_home else "awayTeamId"
                    )
                    team = None
                    if node_team_id:
                        real_id = team_uuid_to_id.get(node_team_id, node_team_id)
                        try:
                            team = Team.objects.get(pk=real_id)
                        except (Team.DoesNotExist, ValueError):
                            pass

                    res_defaults = {"team": team}
                    scores = node_data.get("halftime_score")
                    final = node_data.get("final_score")
                    if scores:
                        res_defaults["fh"] = scores.get("home" if is_home else "away")
                    if final:
                        fh = (
                            (
                                res_defaults.get("fh")
                                or scores.get("home" if is_home else "away")
                                or 0
                            )
                            if scores
                            else 0
                        )
                        final_val = final.get("home" if is_home else "away", 0)
                        res_defaults["sh"] = final_val - fh

                    Gameresult.objects.update_or_create(
                        gameinfo=gameinfo, isHome=is_home, defaults=res_defaults
                    )

        # Save updated designer_data back to the new model
        if hasattr(gameday, "designer_state"):
            gameday.designer_state.state_data = designer_data
            gameday.designer_state.save()

        return Response(GamedaySerializer(gameday).data, status=status.HTTP_200_OK)


class GameResultUpdateAPIView(APIView):
    def patch(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        game = get_object_or_404(Gameinfo, pk=pk)

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

            home_fh = halftime_score.get("home", 0) if halftime_score else (home_res.fh if home_res else 0)
            away_fh = halftime_score.get("away", 0) if halftime_score else (away_res.fh if away_res else 0)

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

    def get(self, request, gameday_pk=None):
        """GET /api/gamedays/{gameday_id}/games/"""
        try:
            gameday = Gameday.objects.get(pk=gameday_pk)
        except Gameday.DoesNotExist:
            return Response(
                {"error": "Gameday not found"}, status=status.HTTP_404_NOT_FOUND
            )

        games = Gameinfo.objects.filter(gameday=gameday)
        serializer = GameInfoSerializer(games, many=True)
        return Response(serializer.data)


class GameResultsUpdateView(APIView):
    """Update game results for a specific game"""

    def post(self, request, gameday_pk=None, game_pk=None):
        """POST /api/gamedays/{gameday_id}/games/{game_id}/results/"""
        try:
            game = Gameinfo.objects.get(pk=game_pk, gameday_id=gameday_pk)
        except Gameinfo.DoesNotExist:
            return Response(
                {"error": "Game not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = GameResultsUpdateSerializer(game, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
