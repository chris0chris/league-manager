from datetime import datetime

from django import forms

from gamedays.models import Team, Person
from passcheck.models import Playerlist, Player


class PlayerlistCreateForm(forms.ModelForm):
    first_name = forms.CharField(label="Vorname", max_length=50)
    last_name = forms.CharField(label="Nachname", max_length=50)
    year_of_birth = forms.IntegerField(label="Geburtsjahr", min_value=1900, max_value=2100)
    sex = forms.ChoiceField(label="Geschlecht", choices=Person.SEX_CHOICES)
    pass_number = forms.IntegerField(label="Passnummer")

    class Meta:
        model = Playerlist
        fields = ['team', 'jersey_number']
        labels = {
            'team': 'Team',
            'jersey_number': 'Trikotnummer',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

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

        if self.instance and self.instance.pk:
            self.fields['first_name'].initial = self.instance.player.person.first_name
            self.fields['last_name'].initial = self.instance.player.person.last_name
            self.fields['pass_number'].initial = self.instance.player.pass_number
            self.fields['year_of_birth'].initial = self.instance.player.person.year_of_birth
            self.fields['sex'].initial = self.instance.player.person.sex

    def save(self, commit=True):
        first_name = self.cleaned_data.get('first_name')
        last_name = self.cleaned_data.get('last_name')
        year_of_birth = self.cleaned_data.get('year_of_birth')
        sex = self.cleaned_data.get('sex')
        pass_number = self.cleaned_data.get('pass_number')

        person = Person.objects.create(
            first_name=first_name,
            last_name=last_name,
            year_of_birth=year_of_birth,
            sex=sex
        )

        player = Player.objects.create(
            person=person,
            pass_number=pass_number
        )

        playerlist = super().save(commit=False)
        playerlist.player = player

        if commit:
            playerlist.save()
            self.save_m2m()

        return playerlist


class PlayerlistUpdateForm(PlayerlistCreateForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['pass_number'].widget.attrs['readonly'] = 'true'
        self.fields['pass_number'].widget.attrs['class'] = 'bg-light'
        self.fields['pass_number'].help_text = ('Die Passnummer ist nicht bearbeitbar. '
                                                'Wenn diese nicht stimmen sollte, '
                                                'dann schicke bitte eine entsprechende Mail an deine Ligaorganisation.')
