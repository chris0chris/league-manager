"""
Views for gameday_designer app.

Following TDD methodology (GREEN phase) - implementing ViewSets to pass API tests.
Provides REST API for schedule template management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404, render
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
        Filter queryset based on permissions and query parameters.

        Staff sees all templates.
        Non-staff users see all templates (read-only for global).
        Supports filtering by association.
        """
        queryset = ScheduleTemplate.objects.all()

        # Filter by association if provided
        association_id = self.request.query_params.get("association")
        if association_id:
            queryset = queryset.filter(association_id=association_id)

        return queryset.select_related("association", "created_by", "updated_by")

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

        except ApplicationError:
            logging.exception("Error applying schedule template")
            return Response(
                {"error": "Failed to apply template."},
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
        cloned_template = ScheduleTemplate.objects.create(
            name=f"Copy of {template.name}",
            description=template.description,
            num_teams=template.num_teams,
            num_fields=template.num_fields,
            num_groups=template.num_groups,
            game_duration=template.game_duration,
            association=template.association,
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
