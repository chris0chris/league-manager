from django import forms
from django.utils import timezone

from teammanager.models import Gameday, Season, League

SCHEDULE_CHOICES = (
    ("4_1", "4 Teams 1 Feld"),
    ("6_2", "6 Teams 2 Felder"),
    ("7_2", "7 Teams 2 Felder"),
    ("8_3", "8 Teams 3 Felder"),
)


class GamedayCreateForm(forms.ModelForm):
    name = forms.CharField(max_length=100)
    season = forms.ModelChoiceField(queryset=Season.objects.all(), initial=1)
    league = forms.ModelChoiceField(queryset=League.objects.all(), initial=1)
    format = forms.ChoiceField(choices=SCHEDULE_CHOICES)

    class Meta:
        model = Gameday
        exclude = ['author']
        widgets = {
            'date': forms.DateInput(format=('%d.%m.%Y'),
                                    attrs={'type': 'date'}
                                    ),
            'start': forms.TimeInput(format=('%H:%M'), attrs={'type': 'time', 'value': '10:00'})
        }

    def save(self, user=None):
        gameday = super(GamedayCreateForm, self).save(commit=False)
        if self.author:
            gameday.author = self.author
        gameday.save()
        return gameday


class GamedayUpdateForm(forms.ModelForm):
    name = forms.CharField(max_length=100, initial=f'test {timezone.now()}')
    date = forms.DateField(widget=forms.DateInput(
        attrs={'type': 'date'}
    ))
    start = forms.TimeField(widget=forms.TimeInput(attrs={'type': 'time'}))
    format = forms.ChoiceField(choices=SCHEDULE_CHOICES)
    group1 = forms.CharField(max_length=100, label='Gruppe 1', help_text='Bitte Teams mit Komma separieren')
    group2 = forms.CharField(max_length=100, label='Gruppe 2', required=False,
                             help_text='Bitte Teams mit Komma separieren')
    group3 = forms.CharField(max_length=100, label='Gruppe 3', required=False,
                             help_text='Bitte Teams mit Komma separieren')
    group4 = forms.CharField(max_length=100, label='Gruppe 4', required=False,
                             help_text='Bitte Teams mit Komma separieren')

    class Meta:
        model = Gameday
        fields = '__all__'
