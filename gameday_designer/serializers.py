"""
Serializers for gameday_designer app.

Following TDD methodology (GREEN phase) - implementing serializers to pass tests.
Handles template serialization, validation, and nested relationships.
"""
from rest_framework import serializers
from django.contrib.auth.models import User

from gamedays.models import Gameday
from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam,
    TemplateApplication
)


class TemplateUpdateRuleTeamSerializer(serializers.ModelSerializer):
    """
    Serializer for TemplateUpdateRuleTeam.

    Handles team assignment rules within update rules.
    """

    class Meta:
        model = TemplateUpdateRuleTeam
        fields = [
            'id',
            'role',
            'standing',
            'place',
            'points',
            'pre_finished_override'
        ]


class TemplateUpdateRuleSerializer(serializers.ModelSerializer):
    """
    Serializer for TemplateUpdateRule.

    Includes nested team_rules for complete rule representation.
    """
    team_rules = TemplateUpdateRuleTeamSerializer(many=True, read_only=True)

    class Meta:
        model = TemplateUpdateRule
        fields = [
            'id',
            'slot',
            'pre_finished',
            'team_rules'
        ]


class TemplateSlotSerializer(serializers.ModelSerializer):
    """
    Serializer for TemplateSlot.

    Handles both group/team placeholders and reference strings.
    Validates mutually exclusive placeholder types.
    """

    class Meta:
        model = TemplateSlot
        fields = [
            'id',
            'template',
            'field',
            'slot_order',
            'stage',
            'standing',
            'home_group',
            'home_team',
            'home_reference',
            'away_group',
            'away_team',
            'away_reference',
            'official_group',
            'official_team',
            'official_reference',
            'break_after'
        ]

    def validate(self, data):
        """
        Validate slot data.

        Ensures placeholders are mutually exclusive:
        - Cannot have both group/team AND reference for same role
        """
        errors = {}

        # Validate home team placeholders
        has_home_index = data.get('home_group') is not None and data.get('home_team') is not None
        has_home_ref = data.get('home_reference', '') != ''

        if has_home_index and has_home_ref:
            errors['home_reference'] = (
                'Cannot specify both home_group/home_team and home_reference'
            )

        # Validate away team placeholders
        has_away_index = data.get('away_group') is not None and data.get('away_team') is not None
        has_away_ref = data.get('away_reference', '') != ''

        if has_away_index and has_away_ref:
            errors['away_reference'] = (
                'Cannot specify both away_group/away_team and away_reference'
            )

        # Validate official placeholders
        has_official_index = data.get('official_group') is not None and data.get('official_team') is not None
        has_official_ref = data.get('official_reference', '') != ''

        if has_official_index and has_official_ref:
            errors['official_reference'] = (
                'Cannot specify both official_group/official_team and official_reference'
            )

        if errors:
            raise serializers.ValidationError(errors)

        return data


class ScheduleTemplateListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for template list views.

    Includes computed fields but no nested relationships.
    Optimized for performance in list endpoints.
    """
    association_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    updated_by_username = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleTemplate
        fields = [
            'id',
            'name',
            'description',
            'num_teams',
            'num_fields',
            'num_groups',
            'game_duration',
            'association',
            'association_name',
            'created_by',
            'created_by_username',
            'updated_by',
            'updated_by_username',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['created_by', 'updated_by', 'created_at', 'updated_at']

    def get_association_name(self, obj: ScheduleTemplate) -> str:
        """Get association abbreviation or 'Global' for global templates."""
        if obj.association:
            return obj.association.abbr
        return 'Global'

    def get_created_by_username(self, obj: ScheduleTemplate) -> str:
        """Get username of creator or 'Unknown' if not set."""
        if obj.created_by:
            return obj.created_by.username
        return 'Unknown'

    def get_updated_by_username(self, obj: ScheduleTemplate) -> str:
        """Get username of last updater or 'Unknown' if not set."""
        if obj.updated_by:
            return obj.updated_by.username
        return 'Unknown'


class ScheduleTemplateDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for template detail views.

    Includes nested slots and update rules for complete template representation.
    Auto-populates created_by/updated_by from request.user.
    """
    slots = TemplateSlotSerializer(many=True, read_only=True)
    update_rules = TemplateUpdateRuleSerializer(many=True, read_only=True)
    association_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    updated_by_username = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleTemplate
        fields = [
            'id',
            'name',
            'description',
            'num_teams',
            'num_fields',
            'num_groups',
            'game_duration',
            'association',
            'association_name',
            'created_by',
            'created_by_username',
            'updated_by',
            'updated_by_username',
            'created_at',
            'updated_at',
            'slots',
            'update_rules'
        ]
        read_only_fields = ['created_by', 'updated_by', 'created_at', 'updated_at']

    def get_association_name(self, obj: ScheduleTemplate) -> str:
        """Get association abbreviation or 'Global' for global templates."""
        if obj.association:
            return obj.association.abbr
        return 'Global'

    def get_created_by_username(self, obj: ScheduleTemplate) -> str:
        """Get username of creator or 'Unknown' if not set."""
        if obj.created_by:
            return obj.created_by.username
        return 'Unknown'

    def get_updated_by_username(self, obj: ScheduleTemplate) -> str:
        """Get username of last updater or 'Unknown' if not set."""
        if obj.updated_by:
            return obj.updated_by.username
        return 'Unknown'

    def create(self, validated_data):
        """
        Create template, auto-populating created_by and updated_by from request.

        Args:
            validated_data: Validated template data

        Returns:
            Created ScheduleTemplate instance
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = request.user
            validated_data['updated_by'] = request.user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Update template, auto-populating updated_by from request.

        Args:
            instance: Existing ScheduleTemplate instance
            validated_data: Validated update data

        Returns:
            Updated ScheduleTemplate instance
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['updated_by'] = request.user

        return super().update(instance, validated_data)


class ApplyTemplateRequestSerializer(serializers.Serializer):
    """
    Serializer for template application request (/apply/ endpoint).

    Validates the request to apply a template to a gameday.
    """
    gameday_id = serializers.IntegerField(required=True)
    team_mapping = serializers.JSONField(required=True)

    def validate_gameday_id(self, value):
        """Validate that gameday exists."""
        if not Gameday.objects.filter(pk=value).exists():
            raise serializers.ValidationError(f'Gameday with ID {value} does not exist')
        return value

    def validate_team_mapping(self, value):
        """Validate that team_mapping is a dictionary."""
        if not isinstance(value, dict):
            raise serializers.ValidationError('team_mapping must be a dictionary')
        return value


class TemplateApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for TemplateApplication audit records.

    Read-only serializer for viewing application history.
    """
    template_name = serializers.SerializerMethodField()
    gameday_name = serializers.SerializerMethodField()
    applied_by_username = serializers.SerializerMethodField()

    class Meta:
        model = TemplateApplication
        fields = [
            'id',
            'template',
            'template_name',
            'gameday',
            'gameday_name',
            'applied_at',
            'applied_by',
            'applied_by_username',
            'team_mapping'
        ]
        read_only_fields = fields  # All fields are read-only

    def get_template_name(self, obj: TemplateApplication) -> str:
        """Get template name."""
        return obj.template.name

    def get_gameday_name(self, obj: TemplateApplication) -> str:
        """Get gameday name."""
        return obj.gameday.name

    def get_applied_by_username(self, obj: TemplateApplication) -> str:
        """Get username of user who applied template."""
        if obj.applied_by:
            return obj.applied_by.username
        return 'Unknown'
