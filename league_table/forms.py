from django import forms

from gamedays.models import Gameday
from league_table.models import LeagueSeasonConfig


class LeagueSeasonConfigForm(forms.ModelForm):
    class Meta:
        model = LeagueSeasonConfig
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.season_id:
            self.fields['exclude_gamedays'].queryset = (
                Gameday.objects.filter(season=self.instance.season, league=self.instance.league)
            )
