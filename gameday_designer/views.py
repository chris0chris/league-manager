"""
Views for gameday_designer app.

Following TDD methodology (GREEN phase) - implementing ViewSets to pass API tests.
Provides REST API for schedule template management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import IntegrityError
from django.db.models import Q
from django.shortcuts import get_object_or_404, render
from django.contrib.auth.decorators import login_required

import logging


class TemplatePagination(PageNumberPagination):
    page_size = 1000

from gamedays.models import Gameday, Team
from gameday_designer.models import (
    ScheduleTemplate,
    TemplateApplication,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam,
)
from gameday_designer.serializers import (
    ScheduleTemplateListSerializer,
    ScheduleTemplateDetailSerializer,
    ApplyTemplateRequestSerializer,
    TemplateApplicationSerializer,
)
from gameday_designer.permissions import IsAssociationMemberOrStaff, CanApplyTemplate
from gameday_designer.service.template_validation_service import (
    TemplateValidationService,
)
from gameday_designer.service.template_application_service import (
    TemplateApplicationService,
    ApplicationError,
)


@login_required
def index(request):
    """Render the Gameday Designer React app."""
    return render(request, "gameday_designer/index.html")


class ScheduleTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ScheduleTemplate CRUD and custom actions.

    Endpoints:
    - GET /templates/ - List templates
    - POST /templates/ - Create template
    - GET /templates/{id}/ - Retrieve template
    - PUT/PATCH /templates/{id}/ - Update template
    - DELETE /templates/{id}/ - Delete template
    - POST /templates/{id}/apply/ - Apply template to gameday
    - POST /templates/{id}/clone/ - Clone template
    - GET /templates/{id}/validate/ - Validate template
    - GET /templates/{id}/preview/ - Preview schedule
    - GET /templates/{id}/usage/ - Usage statistics
    """

    queryset = ScheduleTemplate.objects.all()
    permission_classes = [IsAssociationMemberOrStaff]
    pagination_class = TemplatePagination

    def get_permissions(self):
        """
        Return appropriate permissions based on action.
        """
        if self.action == "apply":
            return [CanApplyTemplate()]
        return super().get_permissions()

    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.

        List uses lightweight serializer, detail uses full serializer with nested data.
        """
        if self.action == "list":
            return ScheduleTemplateListSerializer
        return ScheduleTemplateDetailSerializer

    def get_queryset(self):
        """
        Filter templates based on sharing settings:
        - GLOBAL templates (visible to everyone)
        - ASSOCIATION templates (visible to all authenticated users, but restricted write)
        - PRIVATE templates (visible to creator and staff)
        Staff users see all templates.

        Supports ?sharing=personal|association|global to narrow results further.
        """
        user = self.request.user

        # Staff sees everything
        if user and user.is_authenticated and user.is_staff:
            queryset = ScheduleTemplate.objects.all().select_related(
                "association", "created_by", "updated_by"
            )
        else:
            # Base query: Global templates are ALWAYS visible
            query = Q(sharing=ScheduleTemplate.SHARING_GLOBAL)

            # ASSOCIATION templates matching user's association
            if user and user.is_authenticated:
                from gamedays.models import UserProfile

                try:
                    profile = UserProfile.objects.get(user=user)
                    user_association = profile.team.association if profile.team else None
                except UserProfile.DoesNotExist:
                    user_association = None

                # Add private templates owned by this user
                query |= Q(created_by=user, sharing=ScheduleTemplate.SHARING_PRIVATE)

                # Add association templates (restricted to user's association)
                if user_association:
                    query |= Q(
                        association=user_association, sharing=ScheduleTemplate.SHARING_ASSOCIATION
                    )

            # Support filtering by association if provided in query params
            assoc_id = self.request.query_params.get("association")
            if assoc_id:
                query |= Q(association_id=assoc_id, sharing=ScheduleTemplate.SHARING_ASSOCIATION)

            queryset = (
                ScheduleTemplate.objects.filter(query)
                .distinct()
                .select_related("association", "created_by", "updated_by")
            )

        # Apply ?sharing= query param to narrow results
        sharing_param = self.request.query_params.get("sharing")
        if sharing_param == "personal":
            queryset = queryset.filter(
                sharing=ScheduleTemplate.SHARING_PRIVATE, created_by=user
            )
        elif sharing_param == "association":
            queryset = queryset.filter(sharing=ScheduleTemplate.SHARING_ASSOCIATION)
        elif sharing_param == "global":
            queryset = queryset.filter(sharing=ScheduleTemplate.SHARING_GLOBAL)

        return queryset

    def perform_create(self, serializer):
        """
        Create template, auto-populating created_by and updated_by.

        Serializer handles this, but we ensure it's set.
        """
        serializer.save()

    def perform_update(self, serializer):
        """
        Update template, auto-populating updated_by.

        Serializer handles this, but we ensure it's set.
        """
        serializer.save()

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[CanApplyTemplate],
        serializer_class=ApplyTemplateRequestSerializer,
    )
    def apply(self, request, pk=None):
        """
        Apply template to a gameday.

        POST /templates/{id}/apply/
        Body: {gameday_id: int, team_mapping: {}}

        Returns:
            200: {success: true, gameinfos_created: int, message: str}
            400: {error: str}
        """
        template = self.get_object()

        # Validate request data
        serializer = ApplyTemplateRequestSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        gameday_id = serializer.validated_data["gameday_id"]
        team_mapping = serializer.validated_data["team_mapping"]

        # Get gameday
        gameday = get_object_or_404(Gameday, pk=gameday_id)

        # Apply template using service
        try:
            service = TemplateApplicationService(
                template=template,
                gameday=gameday,
                team_mapping=team_mapping,
                applied_by=request.user if request.user.is_authenticated else None,
                start_time=serializer.validated_data['start_time'],
                game_duration=serializer.validated_data['game_duration'],
                break_duration=serializer.validated_data['break_duration'],
                num_fields=serializer.validated_data['num_fields'],
            )
            result = service.apply()

            return Response(
                {
                    "success": result.success,
                    "gameinfos_created": result.gameinfos_created,
                    "message": result.message,
                },
                status=status.HTTP_200_OK,
            )

        except ApplicationError as e:
            logging.exception("Error applying schedule template")
            return Response(
                {"error": "Failed to apply template"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        """
        Clone template (with all slots and update rules).

        POST /templates/{id}/clone/

        Returns:
            201: Cloned template data
        """
        template = self.get_object()

        # Create new template with copied data
        new_name = request.data.get("new_name") or f"Copy of {template.name}"
        cloned_template = ScheduleTemplate.objects.create(
            name=new_name,
            description=template.description,
            num_teams=template.num_teams,
            num_fields=template.num_fields,
            num_groups=template.num_groups,
            game_duration=template.game_duration,
            sharing=ScheduleTemplate.SHARING_PRIVATE,
            association=None,
            created_by=request.user if request.user.is_authenticated else None,
            updated_by=request.user if request.user.is_authenticated else None,
        )

        # Clone slots
        for slot in template.slots.all():
            cloned_slot = slot
            cloned_slot.pk = None  # Create new instance
            cloned_slot.template = cloned_template
            cloned_slot.save()

        # Clone update rules
        for update_rule in template.update_rules.all():
            # Need to map old slot to new slot
            original_slot = update_rule.slot
            new_slot = cloned_template.slots.get(
                field=original_slot.field, slot_order=original_slot.slot_order
            )

            cloned_rule = update_rule
            cloned_rule.pk = None
            cloned_rule.template = cloned_template
            cloned_rule.slot = new_slot
            cloned_rule.save()

            # Clone team rules
            for team_rule in update_rule.team_rules.all():
                cloned_team_rule = team_rule
                cloned_team_rule.pk = None
                cloned_team_rule.update_rule = cloned_rule
                cloned_team_rule.save()

        # Return cloned template
        serializer = ScheduleTemplateDetailSerializer(
            cloned_template, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def validate(self, request, pk=None):
        """
        Validate template consistency.

        GET /templates/{id}/validate/

        Returns:
            200: {is_valid: bool, errors: [], warnings: []}
        """
        template = self.get_object()

        # Use validation service
        service = TemplateValidationService(template)
        is_valid, errors, warnings = service.validate()

        return Response(
            {
                "is_valid": is_valid,
                "errors": [
                    {
                        "id": err.id,
                        "type": err.type,
                        "message": err.message,
                        "affected_slots": err.affected_slots,
                    }
                    for err in errors
                ],
                "warnings": [
                    {
                        "id": warn.id,
                        "type": warn.type,
                        "message": warn.message,
                        "affected_slots": warn.affected_slots,
                    }
                    for warn in warnings
                ],
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        """
        Preview template schedule.

        GET /templates/{id}/preview/

        Returns:
            200: {slots: [...]}
        """
        template = self.get_object()

        from gameday_designer.serializers import TemplateSlotSerializer

        slots = template.slots.all().order_by("field", "slot_order")
        serializer = TemplateSlotSerializer(
            slots, many=True, context={"request": request}
        )

        return Response({"slots": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="save-from-designer")
    def save_from_designer(self, request):
        """
        Create a new ScheduleTemplate from a designer GenericTemplate payload.

        POST /templates/save-from-designer/
        Body: GenericTemplate JSON (name, num_teams, num_fields, num_groups,
              game_duration, sharing, slots[])

        Returns:
            201: {id, name, ...}
            400: {error: str}
        """
        data = request.data

        required = ["name", "num_teams", "num_fields", "num_groups", "slots"]
        for field in required:
            if field not in data:
                return Response(
                    {"error": f"Missing required field: {field}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        sharing = data.get("sharing", ScheduleTemplate.SHARING_PRIVATE)
        if sharing not in (
            ScheduleTemplate.SHARING_PRIVATE,
            ScheduleTemplate.SHARING_ASSOCIATION,
            ScheduleTemplate.SHARING_GLOBAL,
        ):
            sharing = ScheduleTemplate.SHARING_PRIVATE

        template = ScheduleTemplate.objects.create(
            name=data["name"],
            description=data.get("description", ""),
            num_teams=data["num_teams"],
            num_fields=data["num_fields"],
            num_groups=data["num_groups"],
            game_duration=data.get("game_duration", 70),
            sharing=sharing,
            created_by=request.user if request.user.is_authenticated else None,
            updated_by=request.user if request.user.is_authenticated else None,
        )

        for slot_data in data.get("slots", []):
            TemplateSlot.objects.create(
                template=template,
                field=slot_data.get("field", 1),
                slot_order=slot_data.get("slot_order", 1),
                stage=slot_data.get("stage", ""),
                stage_type=slot_data.get("stage_type", "STANDARD"),
                standing=slot_data.get("standing", ""),
                home_group=slot_data.get("home_group"),
                home_team=slot_data.get("home_team"),
                home_reference=slot_data.get("home_reference", ""),
                away_group=slot_data.get("away_group"),
                away_team=slot_data.get("away_team"),
                away_reference=slot_data.get("away_reference", ""),
                official_group=slot_data.get("official_group"),
                official_team=slot_data.get("official_team"),
                official_reference=slot_data.get("official_reference", ""),
                break_after=slot_data.get("break_after", 0),
            )

        serializer = ScheduleTemplateDetailSerializer(
            template, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def usage(self, request, pk=None):
        """
        Get template usage statistics.

        GET /templates/{id}/usage/

        Returns:
            200: {applications_count: int, recent_applications: [...]}
        """
        template = self.get_object()

        applications = TemplateApplication.objects.filter(template=template)
        applications_count = applications.count()

        # Get 10 most recent applications
        recent = applications.order_by("-applied_at")[:10]
        recent_serializer = TemplateApplicationSerializer(
            recent, many=True, context={"request": request}
        )

        return Response(
            {
                "applications_count": applications_count,
                "recent_applications": recent_serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class TeamCreationView(APIView):
    """
    Create a single team by name.

    POST /api/designer/teams/
    Body: {"name": "Team Alpha"}

    Returns:
        201: {"id": 1, "name": "Team Alpha"} — team was created
        200: {"id": 1, "name": "Team Alpha"} — team already existed
        400: {"error": "..."} — validation error
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get("name", "").strip()
        if not name:
            return Response(
                {"error": "name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            team, created = Team.objects.get_or_create(
                name=name,
                defaults={"description": name, "location": "placeholder"},
            )
        except IntegrityError:
            return Response(
                {"error": f"Could not create team '{name}': a team with similar name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response({"id": team.pk, "name": team.name}, status=response_status)


class TeamBulkCreationView(APIView):
    """
    Create N auto-named teams.

    POST /api/designer/teams/bulk/
    Body: {"count": 6}

    Returns:
        201: [{"id": 1, "name": "Team 1"}, ...]
        400: {"error": "..."} — validation error
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = request.data.get("count")
        if count is None:
            return Response(
                {"error": "count is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            count = int(count)
        except (TypeError, ValueError):
            return Response(
                {"error": "count must be an integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if count < 1:
            return Response(
                {"error": "count must be between 1 and 50"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if count > 50:
            return Response(
                {"error": "count must be between 1 and 50"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teams = []
        for i in range(1, count + 1):
            name = f"Team {i}"
            try:
                team, _ = Team.objects.get_or_create(
                    name=name,
                    defaults={"description": name, "location": "placeholder"},
                )
            except IntegrityError:
                return Response(
                    {"error": f"Could not create team '{name}': a team with similar name already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            teams.append({"id": team.pk, "name": team.name})

        return Response(teams, status=status.HTTP_201_CREATED)


class LeagueTeamsView(APIView):
    """
    GET /api/designer/gamedays/<gameday_id>/league-teams/
    Returns teams in the gameday's league+season via SeasonLeagueTeam.
    Falls back to all teams if no SeasonLeagueTeam is configured.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, gameday_id):
        from gamedays.models import SeasonLeagueTeam, Team

        gameday = get_object_or_404(Gameday, pk=gameday_id)
        slt = SeasonLeagueTeam.objects.filter(
            season=gameday.season, league=gameday.league
        ).first()

        if slt:
            teams = slt.teams.select_related("association").all()
        else:
            teams = Team.objects.exclude(location="dummy").select_related("association").order_by("name")

        return Response([
            {
                "id": t.pk,
                "name": t.name,
                "association_id": t.association_id,
                "association_abbr": t.association.abbr if t.association else None,
                "association_name": t.association.name if t.association else None,
            }
            for t in teams
        ])
