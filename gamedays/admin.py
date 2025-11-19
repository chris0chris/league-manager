from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from gamedays.models import (
    Gameday,
    Gameinfo,
    Gameresult,
    GameOfficial,
    GameSetup,
    TeamLog,
    Person,
    LeagueManager,
    GamedayManager,
    TeamManager,
)

# Unregister the default User admin and re-register with search fields
admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    search_fields = ["username", "email", "first_name", "last_name"]


@admin.register(Gameday)
class GamedayAdmin(admin.ModelAdmin):
    search_fields = ["name", "league__name", "season__name"]
    list_display = ["id", "name", "league", "season", "date", "start"]
    list_filter = ["league", "season", "date"]
    date_hierarchy = "date"
    ordering = ["-date"]


admin.site.register(Gameinfo)
admin.site.register(Gameresult)
admin.site.register(GameOfficial)
admin.site.register(Person)
admin.site.register(TeamLog)
admin.site.register(GameSetup)


@admin.register(LeagueManager)
class LeagueManagerAdmin(admin.ModelAdmin):
    list_display = ["user", "league", "season", "created_at", "created_by"]
    list_filter = ["league", "season", "created_at"]
    search_fields = ["user__username", "user__email", "league__name", "season__name"]
    autocomplete_fields = ["user", "league", "season"]
    readonly_fields = ["created_at", "created_by"]
    date_hierarchy = "created_at"

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(GamedayManager)
class GamedayManagerAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "gameday",
        "can_edit_details",
        "can_assign_officials",
        "can_manage_scores",
        "assigned_at",
        "assigned_by",
    ]
    list_filter = [
        "gameday__league",
        "gameday__season",
        "assigned_at",
        "can_edit_details",
        "can_assign_officials",
        "can_manage_scores",
    ]
    search_fields = ["user__username", "gameday__name"]
    autocomplete_fields = ["user", "gameday"]
    readonly_fields = ["assigned_at", "assigned_by"]
    date_hierarchy = "assigned_at"

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("user", "gameday", "assigned_by", "assigned_at")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "can_edit_details",
                    "can_assign_officials",
                    "can_manage_scores",
                ),
                "description": "Control what this gameday manager can do",
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TeamManager)
class TeamManagerAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "team",
        "can_edit_roster",
        "can_submit_passcheck",
        "assigned_at",
        "assigned_by",
    ]
    list_filter = ["team", "assigned_at", "can_edit_roster", "can_submit_passcheck"]
    search_fields = ["user__username", "team__name"]
    autocomplete_fields = ["user", "team"]
    readonly_fields = ["assigned_at", "assigned_by"]
    date_hierarchy = "assigned_at"

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("user", "team", "assigned_by", "assigned_at")},
        ),
        (
            "Permissions",
            {
                "fields": ("can_edit_roster", "can_submit_passcheck"),
                "description": "Control what this team manager can do",
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)
