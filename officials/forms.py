from django import forms


class AddInternalGameOfficialEntryForm(forms.Form):
    entries = forms.CharField(widget=forms.Textarea, label='Spieleinträge',
                              help_text='Einträge in der folgenden Reihenfolge jeweils mit Komma separiert: '
                                        'gameinfo_id, official_id, '
                                        'Position (Referee, Down Judge, Field Judge, Side Judge)')
