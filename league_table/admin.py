from django.contrib import admin

from league_table.forms import LeagueSeasonConfigForm, OverrideOfficialGamedaySettingForm
from league_table.models import (
    LeagueGroup,
    LeagueRuleset,
    LeagueSeasonConfig,
    TeamPointAdjustments,
    LeagueRulesetTieBreak,
    TieBreakStep,
    OverrideOfficialGamedaySetting,
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


@admin.register(OverrideOfficialGamedaySetting)
class OverrideOfficialGamedaySettingAdmin(admin.ModelAdmin):
    form = OverrideOfficialGamedaySettingForm


@admin.register(LeagueSeasonConfig)
class LeagueSeasonConfigAdmin(admin.ModelAdmin):
    form = LeagueSeasonConfigForm

    list_display = ('league', 'season', 'ruleset', 'leagues', 'excluded_gamedays')
    ordering = ("league__name","-season__name")

    def leagues(self, obj):
        return ", ".join([league.name for league in obj.leagues_for_league_points.all().order_by('name')])
    leagues.short_description = "Ligen"

    def excluded_gamedays(self, obj):
        return ", ".join([gameday.name for gameday in obj.exclude_gamedays.all().order_by('date')])
    excluded_gamedays.short_description = "Ausgeschlossene Spieltage"