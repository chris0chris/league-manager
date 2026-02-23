from django.contrib import admin

from passcheck.models import (
    Playerlist,
    EligibilityRule,
    TeamRelationship,
    PasscheckVerification,
    Player,
)

admin.site.register(Player)
admin.site.register(Playerlist)
admin.site.register(TeamRelationship)
admin.site.register(EligibilityRule)
admin.site.register(PasscheckVerification)
