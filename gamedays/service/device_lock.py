"""The per-game device lock (``GameSetup.device_id``).

One device owns a game: the first non-empty id written wins, and every write
from another device is refused with a ``409``. Only staff may lift the lock —
the scorecard app offers that as "Spiel übernehmen" while the game runs.

The release therefore has more than one caller (the API endpoint, the admin
action, and a game put back to ``Geplant``), and they must agree on what it
means: clearing the stored id is the whole release. Nothing else is touched,
so the game keeps its setup, its log and its result.
"""

from gamedays.models import GameSetup


def stored_device(game_id) -> str:
    """The id that holds ``game_id``, or ``""`` when the game is free."""
    # ``order_by("pk").first()``: historic duplicate setup rows (there is no
    # unique constraint on gameinfo) must not turn a lock read into a 500.
    return (
        GameSetup.objects.filter(gameinfo_id=game_id)
        .order_by("pk")
        .values_list("device_id", flat=True)
        .first()
        or ""
    )


def release_device_lock(game_id) -> int:
    """Lift the lock of one game; returns how many setup rows were cleared.

    Only rows that actually hold an id are written, so "there was nothing to
    release" is visible to the caller instead of a silent no-op.
    """
    return (
        GameSetup.objects.filter(gameinfo_id=game_id)
        .exclude(device_id="")
        .update(device_id="")
    )
