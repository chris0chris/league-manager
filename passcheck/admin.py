from django.contrib import admin

from passcheck.models import Playerlist, EligibilityRule, TeamRelationship

admin.site.register(Playerlist)
admin.site.register(TeamRelationship)
admin.site.register(EligibilityRule)
