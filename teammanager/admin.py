from django.contrib import admin

from gamedays.models import Season, League, Team, SeasonLeagueTeam, UserProfile, Permissions, UserPermissions, \
    Achievement, PlayerAchievement

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
