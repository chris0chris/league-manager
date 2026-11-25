from datetime import date

from gamedays.models import Association, Gameinfo, GameOfficial
from officials.models import Official, OfficialExternalGames
from officials.service.association_resolution import resolve_association

# Closed set of positions an official can be assigned - shared by
# check_for_allowed_value() (used by both InternalGameOfficialEntry and
# GameOfficialCorrectionEntry) and by the import forms' position
# ChoiceFields, so the allowed values can't drift between the two.
ALLOWED_POSITIONS = ("Referee", "Down Judge", "Field Judge", "Side Judge")

# The "außerhalb DFFL" self-report branch additionally accepts "Mix" -
# a referee reporting having worked multiple positions across an
# external tournament, which has no single-slot equivalent the way an
# internal game's fixed 4-position crew does. ExternalGameOfficialEntry
# itself never validates position (OfficialExternalGames.position is an
# unconstrained CharField) - this only affects preview classification
# and the review-formset's ChoiceField, both updated to match.
EXTERNAL_ALLOWED_POSITIONS = ALLOWED_POSITIONS + ("Mix",)


class AmbiguousGameOfficialError(Exception):
    """Raised when a correction targets a (gameinfo, position) pair that
    already has 2+ GameOfficial rows - there is no single "the" existing
    assignment to update, so the caller must resolve the ambiguity
    manually rather than have this class guess which row to change."""


def convert_to_int(attr_name, value):
    try:
        return int(value)
    except ValueError:
        raise TypeError(f"{attr_name} muss eine Zahl sein!")


def check_for_allowed_value(position):
    if position in ALLOWED_POSITIONS:
        return position
    raise ValueError(
        "Position muss genau einen der Werte haben: Referee, Down Judge, Field Judge, Side Judge!"
    )


def find_game_officials(gameinfo_id, position) -> list[GameOfficial]:
    """All existing GameOfficial rows for a given game + position - the
    shared lookup both the import preview resolver and
    GameOfficialCorrectionEntry.save() run through classify_match_count(),
    so the two can't independently drift on what counts as a match."""
    return list(GameOfficial.objects.filter(gameinfo_id=gameinfo_id, position=position))


def classify_match_count(matches) -> str:
    """The single 0/1/>1 rule for deciding what a correction should do
    with existing GameOfficial matches: create a new row, update the one
    existing row, or refuse because it's ambiguous which row to update."""
    count = len(matches)
    if count == 0:
        return "create"
    if count == 1:
        return "update"
    return "ambiguous"


class InternalGameOfficialEntry:
    def __init__(self, gameinfo_id, official_id, position):
        self.gameinfo_id = convert_to_int("gameinfo_id", gameinfo_id)
        self.official_id = convert_to_int("official_id", official_id)
        self.position = check_for_allowed_value(position)

    def save(self) -> str:
        gameinfo = Gameinfo.objects.get(pk=self.gameinfo_id)
        official = Official.objects.get(pk=self.official_id)
        game_official_entry = GameOfficial(
            gameinfo=gameinfo, official=official, position=self.position
        )
        game_official_entry.save()
        return (
            f"ID: {game_official_entry.pk} "
            f"-> Spiel {self.gameinfo_id} - {official.first_name} {official.last_name} als {self.position}"
        )


class GameOfficialCorrectionEntry:
    """Fixes an existing internal game's official assignment - the "DFFL"
    branch of the self-report sheet, mirroring InternalGameOfficialEntry's
    validation but resolving to either an update (exactly one existing
    GameOfficial row for the gameinfo/position) or a create (none exist
    yet), and refusing when the target is ambiguous (2+ rows)."""

    def __init__(self, gameinfo_id, official_id, position):
        self.gameinfo_id = convert_to_int("gameinfo_id", gameinfo_id)
        self.official_id = convert_to_int("official_id", official_id)
        self.position = check_for_allowed_value(position)

    def save(self) -> str:
        gameinfo = Gameinfo.objects.get(pk=self.gameinfo_id)
        official = Official.objects.get(pk=self.official_id)
        matches = find_game_officials(self.gameinfo_id, self.position)
        action = classify_match_count(matches)
        if action == "ambiguous":
            raise AmbiguousGameOfficialError(
                f"Mehrere bestehende Einträge für Spiel {self.gameinfo_id} "
                f"- {self.position} gefunden! Bitte manuell korrigieren."
            )
        if action == "update":
            game_official_entry = matches[0]
            game_official_entry.official = official
            game_official_entry.save()
        else:
            game_official_entry = GameOfficial.objects.create(
                gameinfo=gameinfo, official=official, position=self.position
            )
        return (
            f"ID: {game_official_entry.pk} "
            f"-> Spiel {self.gameinfo_id} - {official.first_name} {official.last_name} als {self.position}"
        )


class ExternalGameOfficialEntry:
    class Meta:
        model = OfficialExternalGames
        fields = "__all__"

    def __init__(
        self,
        official_id,
        number_games,
        date,
        position,
        association,
        halftime_duration,
        has_clockcontrol=False,
        is_international=False,
        reporter_name="",
        notification_date=None,
        comment=None,
    ):
        self.official_id = convert_to_int("official_id", official_id)
        self.number_games = convert_to_int("number_games", number_games)
        self.date = date
        self.position = position
        self.association = association
        self.halftime_duration = halftime_duration
        self.has_clockcontrol = has_clockcontrol
        self.is_international = is_international
        self.reporter_name = reporter_name
        self.notification_date = notification_date
        self.comment = comment

    def save(self) -> str:
        official = Official.objects.get(pk=self.official_id)
        # ``association`` is a FK since migration 0017; imports and the
        # manual staff entry still produce the free-text value from the
        # sheet, so resolve it through the shared resolver. An Association
        # instance (self-service forms) passes through untouched.
        association = (
            self.association
            if isinstance(self.association, Association)
            else resolve_association(self.association)
        )
        external_official_game_entry = OfficialExternalGames.objects.create(
            official=official,
            number_games=self.number_games,
            date=self.date,
            notification_date=self.notification_date or date.today(),
            reporter_name=self.reporter_name,
            position=self.position,
            association=association,
            halftime_duration=self.halftime_duration,
            has_clockcontrol=self.has_clockcontrol,
            is_international=self.is_international,
            # OfficialExternalGames.comment has no null=True despite its
            # default=None (see migration 0008) - the DB column itself is
            # NOT NULL, so a caller-omitted comment must be normalized to
            # "" here rather than passed through as None.
            comment=self.comment or "",
        )
        return (
            f"ID: {external_official_game_entry.pk} "
            f"-> #Spiele {external_official_game_entry.number_games}:"
            f" {official.first_name} {official.last_name} als {external_official_game_entry.position}"
        )
