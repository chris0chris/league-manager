"""Forms for the officials self-service pages.

Kept apart from ``officials/forms.py`` (the staff import/manual-entry forms)
because these are end-user forms with different validation and a different
audience.
"""

from datetime import date

from django import forms

from gamedays.models import Association, Gameday, Gameinfo
from officials.models import OfficialExternalGames
from officials.service.crew_positions import crew_positions_for_league
from officials.service.game_official_entries import EXTERNAL_ALLOWED_POSITIONS


def _gameday_label(gameday: Gameday) -> str:
    return f"{gameday.date:%d.%m.%Y} – {gameday.name}"


def _game_label(game: Gameinfo) -> str:
    results = list(game.gameresult_set.all())
    home = next((result.team.description for result in results if result.isHome), None)
    away = next(
        (result.team.description for result in results if not result.isHome), None
    )
    if home and away:
        return f"{home} vs {away} (#{game.pk})"
    return f"Spiel #{game.pk}"


def allowed_position_choices(gameday: Gameday) -> list[tuple[str, str]]:
    """The crew slots of the gameday's league, minus the scorecard's own slot.

    "Scorecard Judge" is not an officiating duty - it is whoever runs the
    scorecard - so it is not offered for self-assignment.
    """
    return [
        (slot["position"], slot["label"])
        for slot in crew_positions_for_league(gameday.league_id)
        if slot["position"] != "Scorecard Judge"
    ]


class BootstrapInvalidMixin:
    """Mark a bound widget invalid the Bootstrap way.

    Django already puts ``aria-invalid`` on a widget whose field has errors;
    reusing that signal keeps the hand-rendered formset and the crispy single
    form in sync without rendering any field twice.
    """

    def build_attrs(self, base_attrs, extra_attrs=None):
        attrs = super().build_attrs(base_attrs, extra_attrs)
        if attrs.get("aria-invalid"):
            classes = attrs.get("class", "").split()
            if "is-invalid" not in classes:
                classes.append("is-invalid")
            attrs["class"] = " ".join(classes)
        return attrs


class BootstrapDateInput(BootstrapInvalidMixin, forms.DateInput):
    pass


class BootstrapNumberInput(BootstrapInvalidMixin, forms.NumberInput):
    pass


class BootstrapSelect(BootstrapInvalidMixin, forms.Select):
    pass


class BootstrapTextInput(BootstrapInvalidMixin, forms.TextInput):
    pass


class BootstrapCheckboxInput(BootstrapInvalidMixin, forms.CheckboxInput):
    pass


class AddAssignmentForm(forms.Form):
    """Gameday → game → position, all server-rendered (no JS cascade)."""

    gameday = forms.ModelChoiceField(queryset=Gameday.objects.none(), label="Spieltag")
    gameinfo = forms.ModelChoiceField(queryset=Gameinfo.objects.none(), label="Spiel")
    position = forms.ChoiceField(choices=(), label="Position")

    def __init__(self, *args, season=None, gameday_id=None, **kwargs):
        super().__init__(*args, **kwargs)
        season = season or date.today().year
        self.fields["gameday"].queryset = Gameday.objects.filter(
            date__year=season
        ).order_by("-date", "name")
        self.fields["gameday"].label_from_instance = _gameday_label
        self.fields["gameinfo"].widget.attrs["class"] = "form-select"
        self.fields["position"].widget.attrs["class"] = "form-select"
        if gameday_id:
            self.configure_games(gameday_id)

    def configure_games(self, gameday_id) -> None:
        try:
            gameday = Gameday.objects.filter(pk=gameday_id).first()
        except (TypeError, ValueError):
            gameday = None
        if gameday is None:
            return
        self.fields["gameinfo"].queryset = Gameinfo.objects.filter(
            gameday_id=gameday_id
        ).prefetch_related("gameresult_set__team")
        self.fields["gameinfo"].label_from_instance = _game_label
        self.fields["position"].choices = allowed_position_choices(gameday)


#: The fields an official may edit on their own external game. Staff get
#: ``notification_date``, ``reporter_name`` and the official picker on top.
EXTERNAL_FORM_FIELDS = [
    "date",
    "number_games",
    "position",
    "association",
    "halftime_duration",
    "has_clockcontrol",
    "is_international",
    "comment",
]


def _association_label(association: Association) -> str:
    return f"{association.name} ({association.abbr})"


class ExternalGameForm(forms.ModelForm):
    association = forms.ModelChoiceField(
        queryset=Association.objects.order_by("name"),
        label="Verband",
        help_text="Der Verband, unter dem das Spiel stattgefunden hat.",
        empty_label="Bitte auswählen",
        widget=BootstrapSelect,
    )
    position = forms.ChoiceField(
        choices=[("", "Bitte auswählen")]
        + [(position, position) for position in EXTERNAL_ALLOWED_POSITIONS],
        label="Position",
        widget=BootstrapSelect,
    )

    class Meta:
        model = OfficialExternalGames
        fields = EXTERNAL_FORM_FIELDS
        labels = {
            "date": "Datum",
            "number_games": "Anzahl Spiele",
            "position": "Position",
            "association": "Verband",
            "halftime_duration": "Halbzeitdauer (Minuten)",
            "has_clockcontrol": "Clock Control",
            "is_international": "Internationales Turnier",
            "comment": "Kommentar",
        }
        widgets = {
            "date": BootstrapDateInput(attrs={"type": "date"}, format="%Y-%m-%d"),
            "number_games": BootstrapNumberInput(),
            "halftime_duration": BootstrapNumberInput(),
            "has_clockcontrol": BootstrapCheckboxInput(),
            "is_international": BootstrapCheckboxInput(),
            "comment": BootstrapTextInput(),
        }

    def __init__(self, *args, staff=False, **kwargs):
        super().__init__(*args, **kwargs)
        self.staff = staff
        self.fields["date"].input_formats = ["%Y-%m-%d"]
        self.fields["association"].label_from_instance = _association_label
        # Bootstrap classes, so the formset rows (rendered by hand) match the
        # crispy-rendered single form.
        for name, css in (
            ("date", "form-control form-control-sm"),
            ("number_games", "form-control form-control-sm"),
            ("position", "form-select form-select-sm"),
            ("association", "form-select form-select-sm"),
            ("halftime_duration", "form-control form-control-sm"),
            ("comment", "form-control form-control-sm"),
        ):
            self.fields[name].widget.attrs["class"] = css
        if staff:
            self.fields["notification_date"] = forms.DateField(
                label="Meldedatum",
                required=False,
                widget=BootstrapDateInput(attrs={"type": "date"}, format="%Y-%m-%d"),
                input_formats=["%Y-%m-%d"],
            )
            self.fields["reporter_name"] = forms.CharField(
                label="Meldename", required=False, widget=BootstrapTextInput()
            )
            self.fields["official_id"] = forms.IntegerField(
                label="Offizielle-ID",
                required=False,
                min_value=1,
                widget=BootstrapNumberInput(),
            )
            if self.instance.pk:
                self.fields["notification_date"].initial = (
                    self.instance.notification_date
                )
                self.fields["reporter_name"].initial = self.instance.reporter_name
                self.fields["official_id"].initial = self.instance.official_id

    def clean_date(self):
        value = self.cleaned_data.get("date")
        if value and value > date.today():
            raise forms.ValidationError("Das Datum darf nicht in der Zukunft liegen.")
        return value

    def clean_halftime_duration(self):
        value = self.cleaned_data.get("halftime_duration")
        if value is not None and not 5 <= value <= 35:
            raise forms.ValidationError(
                "Die Halbzeitdauer muss zwischen 5 und 35 Minuten liegen."
            )
        return value

    def clean(self):
        cleaned = super().clean()
        # An omitted Meldedatum means "unchanged", not "clear it" - the
        # column is not nullable.
        if self.staff and cleaned.get("notification_date") is None and self.instance.pk:
            cleaned["notification_date"] = self.instance.notification_date
        return cleaned

    def save(self, commit=True):
        # ``notification_date``/``reporter_name`` are staff-only fields added
        # in __init__, i.e. not part of Meta.fields, so ModelForm's
        # construct_instance would drop them; write them by hand.
        entry = super().save(commit=False)
        if self.staff:
            entry.notification_date = (
                self.cleaned_data.get("notification_date")
                or self.instance.notification_date
            )
            entry.reporter_name = self.cleaned_data.get("reporter_name") or ""
        if commit:
            entry.save()
        return entry


ExternalGameFormSet = forms.formset_factory(ExternalGameForm, extra=1)
