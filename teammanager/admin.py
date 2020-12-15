from django.contrib import admin
from .models import Team, Division, UserProfile, UserPermissions, Permissions, Achievement, PlayerAchievement

# Register your models here.

admin.site.register(Team)
admin.site.register(Division)
admin.site.register(UserProfile)
admin.site.register(UserPermissions)
admin.site.register(Permissions)
admin.site.register(Achievement)
admin.site.register(PlayerAchievement)

# Register your models here.
