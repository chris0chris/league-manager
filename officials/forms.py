from django import forms


class AddInternalGameOfficialEntryForm(forms.Form):
    entries = forms.CharField(widget=forms.Textarea, label='Spieleinträge',
                              help_text='Einträge in der folgenden Reihenfolge jeweils mit Komma separiert: '
                                        'gameinfo_id, official_id, '
                                        'Position (Referee, Down Judge, Field Judge, Side Judge)')


class AddExternalGameOfficialEntryForm(forms.Form):
    entries = forms.CharField(widget=forms.Textarea, label='Spieleinträge',
                              help_text='Einträge in der folgenden Reihenfolge jeweils mit Komma separiert: '
                                        'official_id, #Spiele, Datum (YYYY-mm-dd), Position (Referee, Down Judge, Field Judge, Side Judge, Mix),'
                                        'Verband, OPTIONAL International?, OPTIONAL Anmerkung')
