from django import forms

from gamedays.models import Gameday
from league_table.models import LeagueSeasonConfig, OverrideOfficialGamedaySetting


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


class OverrideOfficialGamedaySettingForm(forms.ModelForm):
    class Meta:
        model = OverrideOfficialGamedaySetting
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.instance: OverrideOfficialGamedaySetting
        if self.instance and self.instance.league_season_config_id:
            self.fields['gameday'].queryset = (
                Gameday.objects.filter(season=self.instance.league_season_config.season, league=self.instance.league_season_config.league)
            )
