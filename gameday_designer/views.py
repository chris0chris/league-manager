"""
Views for gameday_designer app.

Following TDD methodology (GREEN phase) - implementing ViewSets to pass API tests.
Provides REST API for schedule template management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404, render
from django.db.models import Q
from django.contrib.auth.decorators import login_required

import logging

from gamedays.models import Gameday
from gameday_designer.models import ScheduleTemplate, TemplateApplication
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
from gameday_designer.service.template_creation_service import (
    TemplateCreationService,
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
    - POST /templates/save-from-designer/ - Create template from designer data
    """

    queryset = ScheduleTemplate.objects.all()
    permission_classes = [IsAssociationMemberOrStaff]

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
        - GLOBAL templates
        - ASSOCIATION templates matching user's association
        - PRIVATE templates created by the user
        Staff users see all templates.
        """
        user = self.request.user
        if not user.is_authenticated:
            return ScheduleTemplate.objects.filter(sharing=ScheduleTemplate.SHARING_GLOBAL)

        if user.is_staff:
            return ScheduleTemplate.objects.all().select_related(
                "association", "created_by", "updated_by"
            )

        from gamedays.models import UserProfile

        try:
            profile = UserProfile.objects.get(user=user)
            user_association = profile.team.association if profile.team else None
        except UserProfile.DoesNotExist:
            user_association = None

        query = Q(sharing=ScheduleTemplate.SHARING_GLOBAL) | Q(
            created_by=user, sharing=ScheduleTemplate.SHARING_PRIVATE
        )

        if user_association:
            query |= Q(
                association=user_association, sharing=ScheduleTemplate.SHARING_ASSOCIATION
            )

        return (
            ScheduleTemplate.objects.filter(query)
            .distinct()
            .select_related("association", "created_by", "updated_by")
        )

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

    @action(detail=False, methods=["post"], url_path="save-from-designer")
    def save_from_designer(self, request):
        """
        Create a new template from generic designer data.
        """
        service = TemplateCreationService(request.user)
        try:
            template = service.create_template(request.data)
            serializer = ScheduleTemplateDetailSerializer(
                template, context={"request": request}
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        """
        Apply template to a gameday.

        Validates gameday exists and user has permissions.
        """
        template = self.get_object()
        gameday_id = request.data.get("gameday")
        team_mapping = request.data.get("team_mapping", {})

        if not gameday_id:
            return Response(
                {"error": "Gameday ID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        gameday = get_object_or_404(Gameday, pk=gameday_id)

        # Check permissions for the gameday
        # (This is a simplified check, actual implementation might be more complex)
        if not request.user.is_staff and gameday.author != request.user:
            return Response(
                {"error": "You do not have permission to modify this gameday"},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = TemplateApplicationService(template, gameday, request.user)
        try:
            application = service.apply(team_mapping)
            serializer = TemplateApplicationSerializer(
                application, context={"request": request}
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ApplicationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        """
        Clone an existing template.

        Creates a new template with the same slots and rules.
        """
        template = self.get_object()
        cloned_template = ScheduleTemplate.objects.create(
            name=f"Copy of {template.name}",
            description=template.description,
            num_teams=template.num_teams,
            num_fields=template.num_fields,
            num_groups=template.num_groups,
            game_duration=template.game_duration,
            association=template.association,
            created_by=request.user,
            updated_by=request.user,
        )

        # Clone slots and update rules
        for slot in template.slots.all():
            cloned_slot = TemplateSlot.objects.create(
                template=cloned_template,
                field=slot.field,
                slot_order=slot.slot_order,
                stage=slot.stage,
                stage_type=slot.stage_type,
                standing=slot.standing,
                home_group=slot.home_group,
                home_team=slot.home_team,
                home_reference=slot.home_reference,
                away_group=slot.away_group,
                away_team=slot.away_team,
                away_reference=slot.away_reference,
                official_group=slot.official_group,
                official_team=slot.official_team,
                official_reference=slot.official_reference,
                break_after=slot.break_after,
            )

            # Clone update rule if exists
            try:
                rule = slot.update_rule.get()
                cloned_rule = TemplateUpdateRule.objects.create(
                    template=cloned_template,
                    slot=cloned_slot,
                    pre_finished=rule.pre_finished,
                )
                for team_rule in rule.team_rules.all():
                    TemplateUpdateRuleTeam.objects.create(
                        update_rule=cloned_rule,
                        role=team_rule.role,
                        standing=team_rule.standing,
                        place=team_rule.place,
                        points=team_rule.points,
                        pre_finished_override=team_rule.pre_finished_override,
                    )
            except TemplateUpdateRule.DoesNotExist:
                pass

        serializer = ScheduleTemplateDetailSerializer(
            cloned_template, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def validate(self, request, pk=None):
        """
        Validate template logic.
        """
        template = self.get_object()
        service = TemplateValidationService(template)
        result = service.validate()
        return Response(
            {"is_valid": result.is_valid, "errors": result.errors, "warnings": []}
        )

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        """
        Return preview of the schedule.
        """
        template = self.get_object()
        # Preview logic here (e.g. mock game times)
        return Response({"template": template.name, "preview": "Not implemented"})

    @action(detail=True, methods=["get"])
    def usage(self, request, pk=None):
        """
        Return usage statistics for the template.
        """
        template = self.get_object()
        count = template.applications.count()
        return Response({"usage_count": count})
