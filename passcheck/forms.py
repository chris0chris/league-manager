from django import forms

from gamedays.models import Team
from passcheck.models import Playerlist


class PlayerlistCreateForm(forms.ModelForm):
    class Meta:
        model = Playerlist
        fields = ['team', 'first_name', 'last_name', 'jersey_number', 'pass_number', 'sex']
        labels = {
            'team': 'Team',
            'first_name': 'Vorname',
            'last_name': 'Nachname',
            'jersey_number': 'Trikotnummer',
            'pass_number': 'Passnummer',
            'sex': 'Geschlecht',
        }

    def __init__(self, *args, **kwargs):
        super(PlayerlistCreateForm, self).__init__(*args, **kwargs)

        # Check if the logged-in user is a staff member
        user = kwargs.get('initial', {}).get('user')
        is_staff = user and user.is_staff
        self.fields['sex'].initial = 2
        try:
            self.fields['team'].initial = Team.objects.get(name=user.username)
        except Team.DoesNotExist:
            pass
        if is_staff:
            self.fields['team'].queryset = Team.objects.all()
        else:
            self.fields['team'].widget = forms.HiddenInput()
