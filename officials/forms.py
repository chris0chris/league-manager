from django import forms


class AddInternalGameOfficialEntryForm(forms.Form):
    entries = forms.CharField(widget=forms.Textarea, label='Spieleinträge',
                              help_text='Einträge in der folgenden Reihenfolge jeweils mit Komma separiert: '
                                        'gameinfo_id, official_id, '
                                        'Position (Referee, Down Judge, Field Judge, Side Judge)')


class MoodleLoginForm(forms.Form):
    username = forms.CharField(label='Benutername',
                               widget=forms.TextInput(attrs={'placeholder': 'Benutername / E-Mail-Adresse'}))
    password = forms.CharField(label='Passwort', widget=forms.PasswordInput(attrs={'placeholder': 'Passwort'}))
