from django.contrib import admin

from .models import Gameday, Gameinfo, Gameresult

admin.site.register(Gameday)
admin.site.register(Gameinfo)
admin.site.register(Gameresult)
