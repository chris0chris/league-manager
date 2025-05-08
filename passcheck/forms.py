from datetime import datetime

from dal import autocomplete
from django import forms

from gamedays.models import Team, Person
from passcheck.models import Playerlist, Player, PlayerlistTransfer
from passcheck.service.transfer_service import TransferService


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
        widgets = {
            'team': autocomplete.ModelSelect2(
                url='/dal/team'
            )
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.user = kwargs.get('initial', {}).get('user')
        current_year = datetime.today().year
        self.fields['year_of_birth'].widget.attrs['min'] = current_year - 70
        self.fields['year_of_birth'].widget.attrs['max'] = current_year - 5
        is_staff = self.user and self.user.is_staff

        try:
            self.fields['team'].initial = Team.objects.get(name=self.user.username)
            self.fields['team'].label_from_instance = lambda obj: obj.description
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
            self.fields['team'].label_from_instance = lambda obj: obj.description

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


class PlayerlistTransferForm(PlayerlistCreateForm):
    new_team = forms.ModelChoiceField(
        queryset=Team.objects.all(),
        label="Neues Team",
        widget=autocomplete.ModelSelect2(
            url='/dal/team'
        ),
        required=True
    )
    note = forms.CharField(
        widget=forms.Textarea(attrs={"rows": 5}),
        required=False,
        label="Notiz für Grund Genehmigung/Ablehung",
    )

    def __init__(self, *args, action_type=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.action_type = action_type

        fields_order = ['new_team', 'note']
        exclude_fields_for_disabled = ['new_team', 'note']
        for field_name in self.fields:
            if field_name not in exclude_fields_for_disabled:
                self.fields[field_name].disabled = True
                self.fields[field_name].required = False
                fields_order = fields_order + [field_name]
        self.order_fields(fields_order)
        player_to_transfer: PlayerlistTransfer = PlayerlistTransfer.objects.filter(current_team=self.instance,
                                                                                   status='pending').first()
        if player_to_transfer:
            self.fields['new_team'].initial = player_to_transfer.new_team
            self.fields['new_team'].label_from_instance = lambda obj: obj.description
            if not self.user.is_staff:
                self.fields.pop('note')
        else:
            self.fields.pop('note')

    def save(self, commit=True):
        new_team = self.cleaned_data.get('new_team')
        note = self.cleaned_data.get('note')
        transfer_service = TransferService(self.instance, new_team, self.user, note)
        transfer_service.handle_transfer(self.action_type)

        return self.instance
