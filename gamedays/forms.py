from dal import autocomplete
from django import forms
from django.forms import modelformset_factory, formset_factory
from django.utils import timezone

from gamedays.models import Season, League, Gameday, Gameinfo, Team, Gameresult

SCHEDULE_CHOICES = (
    ("", "Bitte auswählen"),
    ("CUSTOM", "Selber anlegen"),
    ("3_1", "3 Teams 1 Gruppe 1 Feld"),
    ("3_hinrunde_1", "3 Teams 1 Gruppe 1 Feld (nur Hinrunde)"),
    ("4_1", "4 Teams 1 Gruppe 1 Feld"),
    ("4_final4_1", "4 Teams 1 Gruppe 1 Feld - 2 Niederlagen KO (Final 4)"),
    ("5_dffl1_2", "5 Teams 1 Gruppe 2 Felder - 20 Min"),
    ("5_2", "5 Teams 1 Gruppe 2 Felder - 30 Min"),
    ("6_2", "6 Teams 2 Gruppen 2 Feldern"),
    ("7_2", "7 Teams 2 Gruppen 2 Feldern"),
    ("8_2", "8 Teams 2 Gruppen 2 Felder"),
    ("8_vfpd_2", "8 Teams 2 Felder nur Viertelfinale und Playdown"),
    ("8_doublevictory_2", "8 Teams 1 Gruppe 2 Felder - Double Victory"),
    ("8_3", "8 Teams 2 Gruppen 3 Felder"),
    ("9_2", "9 Teams 3 Gruppen 2 Felder"),
    ("9_groupfinals_2", "9 Teams 3 Gruppen 2 Felder mit Gruppen Finale"),
    ("9_3", "9 Teams 3 Gruppen 3 Felder"),
    ("5_dfflf_2", "DFFL Frauen 5 Teams 2 Felder"),
    ("8_final8_3", "8 Teams 2 Gruppen 3 Felder - PD direkt - PO ab HF (Final8)"),
    # Spielpläne deaktiviert, weil erst einmal nicht mehr gebraucht werden
    # ("2_1", "2 Teams 1 Feld"),
    # ("11_3", "11 Teams 3 Felder"),
    # ("6_oneDivision_2", "DFFL 7er Division"),
    # ("7_oneDivision_2", "DFFL 8er Division"),
    # ("6_sfl_2", "SFL - 3x3 Conference"),
    # ("7_sfl_2", "7 Teams 1 Gruppe 2 Felder - 3x4 Conference"),
)


class GamedayForm(forms.ModelForm):
    name = forms.CharField(max_length=100)
    season = forms.ModelChoiceField(queryset=Season.objects.all())
    league = forms.ModelChoiceField(queryset=League.objects.all(), empty_label='Bitte auswählen')
    address = forms.CharField(
        label='Adresse',
        widget=forms.TextInput(attrs={'class': 'form-control'})
    )

    class Meta:
        model = Gameday
        fields = ['name', 'season', 'league', 'date', 'start', 'address']
        widgets = {
            'date': forms.DateInput(format='%Y-%m-%d',
                                    attrs={'type': 'date'}
                                    ),
            'start': forms.TimeInput(format='%H:%M', attrs={'type': 'time', 'value': '10:00'}),
        }

    def __init__(self, *args, **kwargs):
        super(GamedayForm, self).__init__(*args, **kwargs)
        last_season = Season.objects.last()
        if last_season:
            self.fields['season'].initial = last_season.id

    def save(self, user=None):
        gameday = super(GamedayForm, self).save(commit=False)
        if self.data.get('format') is None:
            gameday.format = 'INITIAL_EMPTY'
        gameday.save()
        return gameday


class GamedayGaminfoFieldsAndGroupsForm(forms.Form):
    number_groups = forms.IntegerField(label="Anzahl der Gruppen", required=False,
                                       widget=forms.NumberInput(attrs={'class': 'form-control', 'required': True}))
    group_names = forms.MultipleChoiceField(choices=(), label="Gruppenauswahl", required=False,
                                            widget=forms.SelectMultiple(
                                                attrs={'class': 'form-control', 'required': True}))
    number_fields = forms.IntegerField(label="Anzahl der Felder", required=True,
                                       widget=forms.NumberInput(attrs={'class': 'form-control', 'required': True}))
    format = forms.ChoiceField(choices=SCHEDULE_CHOICES, label='Spieltagsformat',
                               widget=forms.Select(attrs={'class': 'form-control', 'required': True}))


class GamedayFormatForm(forms.Form):
    group = forms.ModelMultipleChoiceField(
        label='Gruppe',
        queryset=Team.objects.all(),
        required=False,
        widget=autocomplete.ModelSelect2Multiple(url='/dal/team',
                                                 attrs={'class': 'form-control', 'required': True,
                                                        'style': 'width:auto'}),
    )


def get_gameday_format_formset(extra=1):
    return formset_factory(
        form=GamedayFormatForm,
        extra=extra,
    )


class GameinfoForm(forms.ModelForm):
    home = forms.ModelChoiceField(
        queryset=Team.objects.all(),
        widget=autocomplete.ModelSelect2(url='/dal/team'),
        required=True
    )
    fh_home = forms.IntegerField(required=False,
                                 widget=forms.NumberInput(
                                     attrs={'class': 'form-control', 'aria-label': 'Punkte 1. HZ Heim'})
                                 )
    sh_home = forms.IntegerField(required=False,
                                 widget=forms.NumberInput(
                                     attrs={'class': 'form-control', 'aria-label': 'Punkte 2. HZ Heim'})
                                 )
    away = forms.ModelChoiceField(
        queryset=Team.objects.all(),
        widget=autocomplete.ModelSelect2(url='/dal/team'),
        required=True
    )
    fh_away = forms.IntegerField(required=False,
                                 widget=forms.NumberInput(
                                     attrs={'class': 'form-control', 'aria-label': 'Punkte 1. HZ Gast'})
                                 )
    sh_away = forms.IntegerField(required=False,
                                 widget=forms.NumberInput(
                                     attrs={'class': 'form-control', 'aria-label': 'Punkte 2. HZ Gast'})
                                 )
    field = forms.ChoiceField(choices=(), label='Field', required=True, initial='',
                              widget=forms.Select(attrs={'class': 'form-control', 'style': 'width: auto'}))
    standing = forms.ChoiceField(choices=(), required=True, initial='',
                                 widget=forms.Select(attrs={'class': 'form-control', 'style': 'width: auto'}))
    stage = forms.CharField(
        label='Stage',
        required=True,
        initial='Hauptrunde',
        widget=forms.TextInput(attrs={'class': 'form-control', 'style': 'width: 110px'})
    )

    class Meta:
        model = Gameinfo
        fields = ['scheduled', 'field', 'officials', 'stage', 'status', 'gameStarted', 'gameHalftime',
                  'gameFinished']
        widgets = {
            'scheduled': forms.TimeInput(attrs={'class': 'form-control', 'type': 'time'}),
            'officials': autocomplete.ModelSelect2(
                url='/dal/team',
            ),
            'status': forms.Select(
                choices=(('Geplant', 'Geplant'), ('1. Halbzeit', '1. Halbzeit'), ('2. Halbzeit', '2. Halbzeit'),
                         ('beendet', 'Beendet')), attrs={'class': 'form-control', 'style': 'width: auto'}),
            'gameStarted': forms.TextInput(attrs={'class': 'form-control', 'style': 'width: auto', 'type': 'time'}),
            'gameHalftime': forms.TextInput(attrs={'class': 'form-control', 'style': 'width: auto', 'type': 'time'}),
            'gameFinished': forms.TextInput(attrs={'class': 'form-control', 'style': 'width: auto', 'type': 'time'}),
        }

    def __init__(self, *args, group_choices=None, field_choices=None, **kwargs):
        super().__init__(*args, **kwargs)
        placeholder = [('', 'Bitte auswählen')]
        if group_choices is not None:
            self.fields['standing'].choices = placeholder + list(group_choices) if len(group_choices) > 1 else list(
                group_choices)
        if field_choices is not None:
            self.fields['field'].initial = str(self.fields['field'].initial)
            self.fields['field'].choices = placeholder + list(field_choices) if len(field_choices) > 1 else list(
                field_choices)

        if self.instance.pk:
            home_result: Gameresult = self.instance.gameresult_set.filter(isHome=True).first()
            away_result: Gameresult = self.instance.gameresult_set.filter(isHome=False).first()
            self.fields[
                'standing'].initial = self.instance.league_group_id if self.instance.league_group_id else self.instance.standing
            self.fields['field'].initial = str(self.instance.field)
            if home_result:
                self.fields['home'].initial = home_result.team
                self.fields['fh_home'].initial = home_result.fh
                self.fields['sh_home'].initial = home_result.sh
            if away_result:
                self.fields['away'].initial = away_result.team
                self.fields['fh_away'].initial = away_result.fh
                self.fields['sh_away'].initial = away_result.sh


def get_gameinfo_formset(extra=1):
    return modelformset_factory(
        Gameinfo,
        form=GameinfoForm,
        extra=extra,
        can_delete=True
    )
