from django.contrib import admin

from gamedays.models import (
    Season,
    League,
    Team,
    SeasonLeagueTeam,
    UserProfile,
    Permissions,
    UserPermissions,
    Achievement,
    PlayerAchievement,
)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    search_fields = ["name", "description", "location"]
    list_display = ["name", "description", "location", "association"]
    list_filter = ["association"]
    ordering = ["name"]


@admin.register(League)
class LeagueAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ["id", "name"]
    ordering = ["name"]


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ["id", "name"]
    ordering = ["name"]


admin.site.register(UserProfile)
admin.site.register(UserPermissions)
admin.site.register(Permissions)
admin.site.register(Achievement)
admin.site.register(PlayerAchievement)
admin.site.register(SeasonLeagueTeam)
