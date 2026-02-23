from django.contrib import admin

from league_table.models import LeagueGroup, LeagueRuleset, LeagueSeasonConfig

admin.site.register(LeagueGroup)
admin.site.register(LeagueRuleset)
admin.site.register(LeagueSeasonConfig)
