from django.contrib import admin

from .models import Team, League, UserProfile, UserPermissions, Permissions, Achievement, PlayerAchievement, \
    SeasonLeagueTeam, Season

# Register your models here.

admin.site.register(Team)
admin.site.register(League)
admin.site.register(Season)
admin.site.register(UserProfile)
admin.site.register(UserPermissions)
admin.site.register(Permissions)
admin.site.register(Achievement)
admin.site.register(PlayerAchievement)
admin.site.register(SeasonLeagueTeam)

# Register your models here.
