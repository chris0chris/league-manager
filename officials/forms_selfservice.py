"""Forms for the officials self-service pages.

Kept apart from ``officials/forms.py`` (the staff import/manual-entry forms)
because these are end-user forms with different validation and a different
audience.
"""

from django import forms

from gamedays.models import Gameday, Gameinfo
from officials.service.crew_positions import crew_positions_for_league


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


class AddAssignmentForm(forms.Form):
    """Gameday → game → position, all server-rendered (no JS cascade)."""

    gameday = forms.ModelChoiceField(queryset=Gameday.objects.none(), label="Spieltag")
    gameinfo = forms.ModelChoiceField(queryset=Gameinfo.objects.none(), label="Spiel")
    position = forms.ChoiceField(choices=(), label="Position")

    def __init__(self, *args, season=None, gameday_id=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["gameday"].queryset = Gameday.objects.filter(
            date__year=season
        ).order_by("-date", "name")
        self.fields["gameday"].label_from_instance = _gameday_label
        if gameday_id:
            self.configure_games(gameday_id)

    def configure_games(self, gameday_id) -> None:
        gameday = Gameday.objects.filter(pk=gameday_id).first()
        if gameday is None:
            return
        self.fields["gameinfo"].queryset = Gameinfo.objects.filter(
            gameday_id=gameday_id
        ).prefetch_related("gameresult_set__team")
        self.fields["gameinfo"].label_from_instance = _game_label
        self.fields["position"].choices = allowed_position_choices(gameday)
