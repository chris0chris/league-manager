from django.contrib import admin

from .models import Gameday, Gameinfo, Gameresult, GameOfficial, TeamLog

admin.site.register(Gameday)
admin.site.register(Gameinfo)
admin.site.register(Gameresult)
admin.site.register(GameOfficial)
admin.site.register(TeamLog)
