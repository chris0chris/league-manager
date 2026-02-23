from django.contrib import admin

from gamedays.models import (
    Gameday,
    Gameinfo,
    Gameresult,
    GameOfficial,
    GameSetup,
    TeamLog,
    Person,
)

admin.site.register(Gameday)
admin.site.register(Gameinfo)
admin.site.register(Gameresult)
admin.site.register(GameOfficial)
admin.site.register(Person)
admin.site.register(TeamLog)
admin.site.register(GameSetup)
