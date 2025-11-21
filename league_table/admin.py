from django.contrib import admin

from league_table.forms import LeagueSeasonConfigForm
from league_table.models import (
    LeagueGroup,
    LeagueRuleset,
    LeagueSeasonConfig,
    TeamPointAdjustments,
    LeagueRulesetTieBreak,
    TieBreakStep,
)

admin.site.register(LeagueGroup)
admin.site.register(TeamPointAdjustments)
admin.site.register(TieBreakStep)
admin.site.register(LeagueRulesetTieBreak)


class LeagueRulesetTieBreakInline(admin.TabularInline):
    model = LeagueRulesetTieBreak
    extra = 0


@admin.register(LeagueRuleset)
class LeagueRulesetAdmin(admin.ModelAdmin):
    inlines = [LeagueRulesetTieBreakInline]


@admin.register(LeagueSeasonConfig)
class LeagueSeasonConfigAdmin(admin.ModelAdmin):
    form = LeagueSeasonConfigForm
