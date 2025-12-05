from django.contrib import admin

from gamedays.forms import SeasonLeagueTeamForm
from gamedays.models import (
    Gameday,
    Gameinfo,
    Gameresult,
    GameOfficial,
    GameSetup,
    TeamLog,
    Person,
    Team,
    League,
    Season,
    SeasonLeagueTeam,
)

admin.site.register(Gameday)
admin.site.register(Gameinfo)
admin.site.register(Gameresult)
admin.site.register(GameOfficial)
admin.site.register(GameSetup)
admin.site.register(League)
admin.site.register(Person)
admin.site.register(Season)
admin.site.register(Team)
admin.site.register(TeamLog)


@admin.register(SeasonLeagueTeam)
class SeasonLeagueTeamAdmin(admin.ModelAdmin):
    form = SeasonLeagueTeamForm
    list_display = ('season', 'league', 'team_count', 'team_list')

    def team_count(self, obj):
        return obj.teams.count()
    team_count.short_description = "Team Anzahl"

    def team_list(self, obj):
        return ", ".join([team.description for team in obj.teams.all().order_by('description')])
    team_list.short_description = "Teams"

    actions = ["duplicate_entry"]

    def duplicate_entry(self, request, queryset):
        for obj in queryset:
            teams = Team.objects.none()
            if hasattr(obj, "teams"):
                teams = obj.teams.all()
            new_obj = obj
            new_obj.pk = None
            new_obj.id = None
            new_obj.save()
            new_obj.teams.set(teams)

        self.message_user(request, "Duplikate wurden erfolgreich erstellt und befinden sich am Anfang der Liste!")

    duplicate_entry.short_description = "Duplikat für ausgewählte Elemente erstellen"
