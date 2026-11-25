import os

from django import forms

from officials.service.game_official_entries import EXTERNAL_ALLOWED_POSITIONS

IMPORT_UPLOAD_ALLOWED_EXTENSIONS = (".csv", ".xlsx", ".xls")


class AddInternalGameOfficialEntryForm(forms.Form):
    entries = forms.CharField(
        widget=forms.Textarea,
        label="Spieleinträge",
        help_text="Einträge in der folgenden Reihenfolge jeweils mit Komma separiert: "
        "gameinfo_id, official_id, "
        "Position (Referee, Down Judge, Field Judge, Side Judge)",
    )


class MoodleLoginForm(forms.Form):
    username = forms.CharField(
        label="Benutername",
        widget=forms.TextInput(attrs={"placeholder": "Benutername / E-Mail-Adresse"}),
    )
    password = forms.CharField(
        label="Passwort", widget=forms.PasswordInput(attrs={"placeholder": "Passwort"})
    )
    remember_me = forms.BooleanField(
        required=False,
        label="Angemeldet bleiben",
    )
    next = forms.CharField(required=False, widget=forms.HiddenInput)


class GameOfficialImportUploadForm(forms.Form):
    file = forms.FileField(
        label="Datei (Google-Sheet-Export)",
        help_text="Export der Selbstmelde-Tabelle als .csv oder .xlsx.",
    )

    def clean_file(self):
        uploaded_file = self.cleaned_data["file"]
        _, extension = os.path.splitext(uploaded_file.name.lower())
        if extension not in IMPORT_UPLOAD_ALLOWED_EXTENSIONS:
            raise forms.ValidationError(
                "Nicht unterstütztes Dateiformat - bitte eine .csv- oder "
                ".xlsx-Datei hochladen."
            )
        return uploaded_file


class AddExternalGameOfficialEntryForm(forms.Form):
    """Manual, no-upload fallback for the "außerhalb DFFL" branch -
    mirrors AddInternalGameOfficialEntryForm's one-line-per-entry
    convention (already familiar to staff) instead of inventing a new
    one, just with the additional comma-separated fields
    ExternalGameOfficialEntry needs."""

    entries = forms.CharField(
        widget=forms.Textarea,
        label="Einsätze",
        help_text="Einträge in der folgenden Reihenfolge jeweils mit Komma separiert: "
        "official_id, Anzahl Spiele, Datum (YYYY-MM-DD), Position "
        f"({', '.join(EXTERNAL_ALLOWED_POSITIONS)}), Verband, Dauer einer Halbzeit",
    )
