from django import forms
from django.utils import timezone

from .models import Gameday


class GamedayCreateForm(forms.ModelForm):
    name = forms.CharField(max_length=100, initial=f'test {timezone.now()}')
    date = forms.DateField(initial='2020-10-10')
    start = forms.TimeField(initial='10:00')

    class Meta:
        model = Gameday
        exclude = ['author']

    def save(self, user=None):
        gameday = super(GamedayCreateForm, self).save(commit=False)
        if self.author:
            gameday.author = self.author
        gameday.save()
        return gameday


class GamedayUpdateForm(forms.ModelForm):
    name = forms.CharField(max_length=100, initial=f'test {timezone.now()}')
    date = forms.DateField(initial='2020-10-10')
    start = forms.TimeField(initial='10:00')
    fields = forms.ChoiceField(label='Anzahl Felder', choices=[(1, 1), (2, 2), (3, 3)], initial=2)
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
