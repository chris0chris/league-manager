"""
Django Admin configuration for gameday_designer app.

Provides admin interface for managing schedule templates, slots, update rules, and applications.
"""

from django.contrib import admin
from django.utils.html import format_html

from gameday_designer.models import (
    ScheduleTemplate,
    TemplateSlot,
    TemplateUpdateRule,
    TemplateUpdateRuleTeam,
    TemplateApplication,
)


class TemplateSlotInline(admin.TabularInline):
    """Inline editor for template slots."""

    model = TemplateSlot
    extra = 1
    fields = (
        "field",
        "slot_order",
        "stage",
        "standing",
        "home_group",
        "home_team",
        "home_reference",
        "away_group",
        "away_team",
        "away_reference",
        "official_group",
        "official_team",
        "official_reference",
        "break_after",
    )
    ordering = ["field", "slot_order"]


class TemplateUpdateRuleTeamInline(admin.TabularInline):
    """Inline editor for update rule team assignments."""

    model = TemplateUpdateRuleTeam
    extra = 1
    fields = ("role", "standing", "place", "points", "pre_finished_override")
    can_delete = True


class TemplateUpdateRuleInline(admin.StackedInline):
    """Inline editor for update rules."""

    model = TemplateUpdateRule
    extra = 0
    fields = ("slot", "pre_finished")
    inlines = [
        TemplateUpdateRuleTeamInline
    ]  # Note: Nested inlines not supported in Django admin by default
    can_delete = True


@admin.register(ScheduleTemplate)
class ScheduleTemplateAdmin(admin.ModelAdmin):
    """Admin interface for Schedule Templates."""

    list_display = (
        "name",
        "num_teams",
        "num_fields",
        "num_groups",
        "game_duration",
        "association_display",
        "slots_count",
        "created_at",
        "created_by",
    )

    list_filter = (
        "association",
        "num_teams",
        "num_fields",
        "num_groups",
        "created_at",
    )

    search_fields = ("name", "description")

    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")

    fieldsets = (
        ("Template Information", {"fields": ("name", "description", "association")}),
        (
            "Template Configuration",
            {"fields": ("num_teams", "num_fields", "num_groups", "game_duration")},
        ),
        (
            "Audit Information",
            {
                "fields": ("created_by", "updated_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    inlines = [TemplateSlotInline]

    def association_display(self, obj):
        """Display association name or 'Global'."""
        return obj.association.abbr if obj.association else "Global"

    association_display.short_description = "Association"

    def slots_count(self, obj):
        """Display count of slots in template."""
        count = obj.slots.count()
        return format_html("<strong>{}</strong> slots", count)

    slots_count.short_description = "Slots"

    def save_model(self, request, obj, form, change):
        """Auto-populate created_by and updated_by fields."""
        if not change:  # New object
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TemplateSlot)
class TemplateSlotAdmin(admin.ModelAdmin):
    """Admin interface for Template Slots."""

    list_display = (
        "template",
        "field",
        "slot_order",
        "stage",
        "standing",
        "teams_display",
    )

    list_filter = (
        "template",
        "field",
        "stage",
    )

    search_fields = ("template__name", "standing")

    list_select_related = ("template",)

    fieldsets = (
        ("Slot Position", {"fields": ("template", "field", "slot_order")}),
        ("Game Information", {"fields": ("stage", "standing", "break_after")}),
        (
            "Home Team",
            {
                "fields": ("home_group", "home_team", "home_reference"),
                "description": "Use group/team indices OR reference string, not both",
            },
        ),
        (
            "Away Team",
            {
                "fields": ("away_group", "away_team", "away_reference"),
                "description": "Use group/team indices OR reference string, not both",
            },
        ),
        (
            "Officials",
            {
                "fields": ("official_group", "official_team", "official_reference"),
                "description": "Use group/team indices OR reference string, not both",
            },
        ),
    )

    def teams_display(self, obj):
        """Display home vs away teams."""
        home = (
            f"{obj.home_group}_{obj.home_team}"
            if obj.home_group is not None
            else obj.home_reference
        )
        away = (
            f"{obj.away_group}_{obj.away_team}"
            if obj.away_group is not None
            else obj.away_reference
        )
        return f"{home} vs {away}"

    teams_display.short_description = "Matchup"


@admin.register(TemplateUpdateRule)
class TemplateUpdateRuleAdmin(admin.ModelAdmin):
    """Admin interface for Template Update Rules."""

    list_display = (
        "template",
        "slot_display",
        "pre_finished",
        "team_rules_count",
    )

    list_filter = (
        "template",
        "pre_finished",
    )

    search_fields = ("template__name", "slot__standing")

    list_select_related = ("template", "slot")

    fields = ("template", "slot", "pre_finished")

    inlines = [TemplateUpdateRuleTeamInline]

    def slot_display(self, obj):
        """Display slot information."""
        return (
            f"Field {obj.slot.field}, Slot {obj.slot.slot_order} ({obj.slot.standing})"
        )

    slot_display.short_description = "Slot"

    def team_rules_count(self, obj):
        """Display count of team rules."""
        count = obj.team_rules.count()
        return format_html("<strong>{}</strong> rules", count)

    team_rules_count.short_description = "Team Rules"


@admin.register(TemplateUpdateRuleTeam)
class TemplateUpdateRuleTeamAdmin(admin.ModelAdmin):
    """Admin interface for Template Update Rule Team assignments."""

    list_display = (
        "update_rule_display",
        "role",
        "standing",
        "place",
        "points",
        "pre_finished_override",
    )

    list_filter = (
        "role",
        "place",
    )

    search_fields = ("update_rule__slot__standing", "standing")

    list_select_related = ("update_rule", "update_rule__template", "update_rule__slot")

    fields = (
        "update_rule",
        "role",
        "standing",
        "place",
        "points",
        "pre_finished_override",
    )

    def update_rule_display(self, obj):
        """Display update rule information."""
        return f"{obj.update_rule.template.name} - {obj.update_rule.slot.standing}"

    update_rule_display.short_description = "Update Rule"


@admin.register(TemplateApplication)
class TemplateApplicationAdmin(admin.ModelAdmin):
    """Admin interface for Template Applications (read-only audit trail)."""

    list_display = (
        "template",
        "gameday",
        "applied_at",
        "applied_by",
        "teams_count",
    )

    list_filter = (
        "template",
        "applied_at",
        "applied_by",
    )

    search_fields = ("template__name", "gameday__name")

    list_select_related = ("template", "gameday", "applied_by")

    readonly_fields = (
        "template",
        "gameday",
        "applied_at",
        "applied_by",
        "team_mapping",
    )

    fields = ("template", "gameday", "applied_at", "applied_by", "team_mapping")

    def has_add_permission(self, request):
        """Disable adding application records manually."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Disable deleting application records (audit trail)."""
        return False

    def teams_count(self, obj):
        """Display count of teams in mapping."""
        count = len(obj.team_mapping)
        return format_html("<strong>{}</strong> teams", count)

    teams_count.short_description = "Teams Mapped"
