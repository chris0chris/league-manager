from django.contrib import admin

from accesscontrol.models import TeamAdminAssignment, LeagueAdminAssignment

# Register your models here.

admin.site.register(TeamAdminAssignment)
admin.site.register(LeagueAdminAssignment)
