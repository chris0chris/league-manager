from django.contrib import admin

from gamedays.models import UserProfile, Permissions, UserPermissions, \
    Achievement, PlayerAchievement

# Register your models here.

admin.site.register(UserProfile)
admin.site.register(UserPermissions)
admin.site.register(Permissions)
admin.site.register(Achievement)
admin.site.register(PlayerAchievement)

# Register your models here.
