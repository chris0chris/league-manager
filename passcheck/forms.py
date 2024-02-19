from datetime import datetime

from django import forms

from gamedays.models import Team
from passcheck.models import Playerlist


class PlayerlistCreateForm(forms.ModelForm):
    class Meta:
        model = Playerlist
        fields = ['team', 'first_name', 'last_name', 'jersey_number', 'pass_number', 'year_of_birth', 'sex']
        labels = {
            'team': 'Team',
            'first_name': 'Vorname',
            'last_name': 'Nachname',
            'jersey_number': 'Trikotnummer',
            'pass_number': 'Passnummer',
            'year_of_birth': 'Geburtsjahr',
            'sex': 'Geschlecht',
        }

    def __init__(self, *args, **kwargs):
        super(PlayerlistCreateForm, self).__init__(*args, **kwargs)

        user = kwargs.get('initial', {}).get('user')
        current_year = datetime.today().year
        self.fields['year_of_birth'].widget.attrs['min'] = current_year - 70
        self.fields['year_of_birth'].widget.attrs['max'] = current_year - 15
        is_staff = user and user.is_staff
        try:
            self.fields['team'].initial = Team.objects.get(name=user.username)
        except Team.DoesNotExist:
            pass
        if is_staff:
            self.fields['team'].queryset = Team.objects.all()
        else:
            self.fields['team'].widget = forms.HiddenInput()
