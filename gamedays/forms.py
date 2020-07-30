from django import forms
from django.utils import timezone

from .models import Gameday


class GamedayForm(forms.ModelForm):
    name = forms.CharField(max_length=100, initial=f'test {timezone.now()}')
    date = forms.DateField(initial='2020-10-10')
    start = forms.TimeField(initial='10:00')
    category = forms.ChoiceField(choices=[('4', '4er Spieltag'), ('62', '6er Spieltag 2 Felder')], label='Variante')
    teams = forms.CharField(widget=forms.Textarea, required=False)

    # exclude = ['author']

    class Meta:
        model = Gameday
        exclude = ['author']

    def save(self, user=None):
        author = super(GamedayForm, self).save(commit=False)
        if user:
            author.user = user
        author.save()
        return author
