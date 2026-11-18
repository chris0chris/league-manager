import json
from datetime import UTC, datetime, time

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from gameevents.service.log_payload import event_seqs_for_rows
from gamedays.models import Gameinfo, Gameresult, TeamLog
from gamedays.service.utils import AsJsonEncoder, utc_time_as_iso

EXCLUDED_EVENTS = ["Strafe", "Spielzeit", "Auszeit", "First Down"]

# Scoring vocabulary: how many points an event is worth. Single source of truth
# for "which TeamLog rows are scoring events" (the home page's moments card
# consumes SCORING_EVENTS instead of re-listing these names).
SCORING_EVENT_VALUES = {
    "Touchdown": 6,
    "Overtime": 1,
    "1-Extra-Punkt": 1,
    "Safety (+1)": 1,
    "2-Extra-Punkte": 2,
    "Safety (+2)": 2,
}
SCORING_EVENTS = frozenset(SCORING_EVENT_VALUES)

# Valid range of TeamLog.player (PositiveSmallIntegerField). Enforced here
# explicitly because SQLite does not range-check integer columns (#1465).
PLAYER_MIN, PLAYER_MAX = 0, 32767


class GameLogCreator(object):
    def __init__(self, gameinfo, team, event, user, half=1):
        self.gameinfo = gameinfo
        self.team = team
        self.half = half
        self.event = event
        self.user = user

    def create(self):
        # NOTE (#2006): no UniqueConstraint on (gameinfo, sequence) is
        # possible -- several TeamLog rows intentionally share one sequence
        # (Touchdown + PAT are two rows with the same sequence; every
        # EXCLUDED_EVENTS entry uses sequence 0). Uniqueness of logical
        # sequences is enforced by serializing allocation below instead.
        if not self._needs_sequence():
            return self._create_with_sequence(0)
        with transaction.atomic():
            # Serialize sequence allocation per game. On MySQL/Postgres this
            # takes a row lock so two concurrent writes cannot read the same
            # max(sequence); on SQLite it is a no-op (dev/demo only). Safe to
            # nest inside GameService._write_gamelog's transaction (which
            # holds the Gameresult rows): lock order is always
            # Gameresult -> Gameinfo.
            Gameinfo.objects.select_for_update().get(pk=self.gameinfo.pk)
            return self._create_with_sequence(self._getSequence())

    def _needs_sequence(self):
        return any(entry.get("name") not in EXCLUDED_EVENTS for entry in self.event)

    def _create_with_sequence(self, sequence):
        for entry in self.event:
            teamlog = TeamLog()
            teamlog.gameinfo = self.gameinfo
            teamlog.team = self.team
            teamlog.sequence = (
                sequence if entry.get("name") not in EXCLUDED_EVENTS else 0
            )
            teamlog.cop = entry.get("name") in ["Turnover", "Interception"]
            teamlog.event = entry.get("name")
            teamlog.input = entry.get("input")
            teamlog.player = self._coerce_player(entry.get("player"))
            # A scoring row is worth its points whether or not it names a
            # player: the score belongs to the team (IFAF R 8-1-1).
            teamlog.value = self._getValue(entry.get("name"), entry.get("payload"))
            teamlog.half = self.half
            teamlog.author = self.user
            teamlog.save()
        return GameLog(self.gameinfo)

    def _getSequence(self):
        entryWithLatestSequence: TeamLog = (
            TeamLog.objects.filter(gameinfo=self.gameinfo).order_by("-sequence").first()
        )
        if entryWithLatestSequence:
            return entryWithLatestSequence.sequence + 1
        return 1

    def _getValue(self, name, payload=None):
        # ToDo deleteMe ... info should come via API request
        # A missed try keeps its name ("1-Extra-Punkt"/"2-Extra-Punkte") but is
        # worth nothing: the client marks it in the payload, so the value is
        # never derived from the name alone (a miss must not score).
        if isinstance(payload, dict) and payload.get("missed") is True:
            return 0
        return SCORING_EVENT_VALUES.get(name, 0)

    @staticmethod
    def _coerce_player(value):
        """Sanitise the jersey number that arrives raw from the client (#1465).

        A decimal string such as ``'51.85'`` is truncated to an integer; any
        value that is not a jersey number storable in ``TeamLog.player``
        (non-numeric, out of the field's range) is dropped to ``None`` so
        garbage can never reach the database.
        """
        if value is None or value == "":
            return None
        try:
            number = int(float(value))
        except (TypeError, ValueError):
            return None
        if not PLAYER_MIN <= number <= PLAYER_MAX:
            return None
        return number


def gameday_ref_now(gameday_date):
    """Anchor log times to the gameday date, not to the request time.

    A snapshot also serves past gamedays; anchoring at noon UTC lets
    ``utc_time_as_iso`` resolve the date of both 00:05 and 23:59 ticks to the
    gameday's date.
    """
    if gameday_date is None:
        return None
    return datetime.combine(gameday_date, time(12, 0), tzinfo=UTC)


def serialize_events(
    teamlog_rows, team_names, ref_now=None, seq_by_row=None, payload_by_row=None
) -> list[dict]:
    """Shape ``TeamLog`` rows into the additive, flat ``events`` list.

    ``team_names`` maps a team pk to its display name, so callers that already
    have the two results (the gamelog endpoint, the snapshot) never trigger a
    per-row ``team`` query. One helper for every producer keeps the payload
    shape from drifting.

    ``seq_by_row`` maps a ``TeamLog`` pk to the event ``seq`` a correction
    names (``gameevents.service.log_payload``). It is optional so a caller
    without the event store still gets today's payload; ``seq`` is then
    ``None``, which is exactly what a row no event wrote means -- there is
    nothing to correct.

    Ordering is newest first by primary key, not by ``created_time``: that
    column is a UTC time-of-day, so a 23:59 row would sort before the 00:05
    row entered after midnight. Insertion order is chronological and keeps a
    touchdown and its conversion adjacent.
    """
    seq_by_row = seq_by_row or {}
    payload_by_row = payload_by_row or {}
    rows = sorted(teamlog_rows, key=lambda row: row.pk, reverse=True)
    return [
        {
            "id": row.pk,
            "sequence": row.sequence,
            "seq": seq_by_row.get(row.pk),
            "team": team_names.get(row.team_id),
            "event": row.event,
            "player": row.player,
            # An empty string would render as an empty detail line.
            "input": row.input or None,
            "half": row.half,
            "cop": row.cop,
            "isDeleted": row.isDeleted,
            # The structured record an event wrote (yards, quarterback,
            # complete, defence); None for a row no event wrote.
            "payload": payload_by_row.get(row.pk),
            "time": utc_time_as_iso(row.created_time, ref_now=ref_now),
        }
        for row in rows
    ]


class GameLog(object):
    home_firsthalf_entries: QuerySet[TeamLog] = None
    away_firsthalf_entries: QuerySet[TeamLog] = None
    home_secondhalf_entries: QuerySet[TeamLog] = None
    away_secondhalf_entries: QuerySet[TeamLog] = None

    def __init__(self, gameinfo):
        self.gameinfo = gameinfo
        home_team = Gameresult.objects.get(gameinfo=self.gameinfo, isHome=True).team
        away_team = Gameresult.objects.get(gameinfo=self.gameinfo, isHome=False).team
        self.gamelog = GameLogObject(
            gameinfo.pk,
            home_team.name,
            away_team.name,
            home_team.pk,
            away_team.pk,
        )

    def as_json(self):
        self.gamelog.is_first_half = self.is_firsthalf()
        self.gamelog.in_possession = self.gameinfo.in_possession or None
        self.gamelog.events = self.game_events()
        self.gamelog.home.score = self.get_home_score()
        self.gamelog.away.score = self.get_away_score()
        self.gamelog.home.firsthalf.score = self._calc_score(
            self.get_entries_home_firsthalf()
        )
        self.gamelog.home.firsthalf.entries = self.create_entries_for_half(
            self.get_entries_home_firsthalf()
        )
        self.gamelog.away.firsthalf.score = self._calc_score(
            self.get_entries_away_firsthalf()
        )
        self.gamelog.away.firsthalf.entries = self.create_entries_for_half(
            self.get_entries_away_firsthalf()
        )
        self.gamelog.home.secondhalf.score = self._calc_score(
            self.get_entries_home_secondhalf()
        )
        self.gamelog.home.secondhalf.entries = self.create_entries_for_half(
            self.get_entries_home_secondhalf()
        )
        self.gamelog.away.secondhalf.score = self._calc_score(
            self.get_entries_away_secondhalf()
        )
        self.gamelog.away.secondhalf.entries = self.create_entries_for_half(
            self.get_entries_away_secondhalf()
        )
        return json.dumps(self.gamelog, cls=(AsJsonEncoder))

    def get_home_team(self):
        return self.gamelog.home.name

    def get_away_team(self):
        return self.gamelog.away.name

    def game_events(self):
        """Every raw row of this game, including the non-scoring events.

        ``_get_entries_for_team_and_half`` deliberately drops penalties,
        timeouts, first downs and time because the old scorecard's play list
        cannot render them. The v2 log shows and undoes them one by one.
        """
        team_names = {
            team.id: team.name
            for team in (self.gamelog.home, self.gamelog.away)
            if team.id is not None
        }
        rows = list(TeamLog.objects.filter(gameinfo=self.gameinfo))
        return serialize_events(
            rows,
            team_names,
            gameday_ref_now(self.gameinfo.gameday.date),
            event_seqs_for_rows(rows, self.gameinfo.pk),
        )

    def get_entries_home_firsthalf(self):
        if self.home_firsthalf_entries:
            return self.home_firsthalf_entries
        self.home_firsthalf_entries = self._get_entries_for_team_and_half(
            team=self.gamelog.home.name, half=1
        )
        return self.home_firsthalf_entries

    def get_entries_away_firsthalf(self):
        if self.away_firsthalf_entries:
            return self.away_firsthalf_entries
        self.away_firsthalf_entries = self._get_entries_for_team_and_half(
            team=self.gamelog.away.name, half=1
        )
        return self.away_firsthalf_entries

    def get_entries_home_secondhalf(self):
        if self.home_secondhalf_entries:
            return self.home_secondhalf_entries
        self.home_secondhalf_entries = self._get_entries_for_team_and_half(
            team=self.gamelog.home.name, half=2
        )
        return self.home_secondhalf_entries

    def get_entries_away_secondhalf(self):
        if self.away_secondhalf_entries:
            return self.away_secondhalf_entries
        self.away_secondhalf_entries = self._get_entries_for_team_and_half(
            team=self.gamelog.away.name, half=2
        )
        return self.away_secondhalf_entries

    def _get_entries_for_team_and_half(self, team, half):
        return (
            TeamLog.objects.filter(gameinfo=self.gameinfo, team__name=team, half=half)
            .exclude(event__in=EXCLUDED_EVENTS)
            .order_by("-sequence")
        )

    def get_home_score(self):
        return self.get_home_firsthalf_score() + self.get_home_secondhalf_score()

    def get_away_score(self):
        return self.get_away_firsthalf_score() + self.get_away_secondhalf_score()

    def _calc_score(self, half_entries):
        sum = 0
        entry: TeamLog
        for entry in half_entries:
            if not entry.isDeleted:
                sum = sum + entry.value
        return sum

    def create_entries_for_half(self, half_entries):
        result = dict()
        entry: TeamLog
        for entry in half_entries:
            if result.get(entry.sequence) is None:
                result[entry.sequence] = {"sequence": entry.sequence}
            if entry.cop:
                result[entry.sequence].update(
                    {
                        "cop": entry.cop,
                        "name": entry.event,
                    }
                )
            else:
                if entry.event == "Touchdown":
                    key = "td"
                elif entry.event == "1-Extra-Punkt":
                    key = "pat1"
                elif entry.event == "2-Extra-Punkte":
                    key = "pat2"
                elif entry.event == "Overtime":
                    key = "OT"
                else:
                    key = entry.event
                result[entry.sequence].update({key: entry.player})
            if entry.isDeleted:
                result[entry.sequence].update({"isDeleted": True})
        return list(result.values())

    def is_firsthalf(self):
        return self.gameinfo.gameHalftime is None

    def get_home_firsthalf_score(self):
        return self._calc_score(self.get_entries_home_firsthalf())

    def get_home_secondhalf_score(self):
        return self._calc_score(self.get_entries_home_secondhalf())

    def get_away_firsthalf_score(self):
        return self._calc_score(self.get_entries_away_firsthalf())

    def get_away_secondhalf_score(self):
        return self._calc_score(self.get_entries_away_secondhalf())

    def mark_entries_as_deleted(self, sequence):
        # Queryset .update() bypasses save(), so auto_now would not fire:
        # stamp explicitly. The snapshot ETag depends on Max(updated_at).
        TeamLog.objects.filter(gameinfo=self.gameinfo, sequence=sequence).update(
            isDeleted=True, updated_at=timezone.now()
        )

    def mark_entry_as_deleted(self, team_log_id):
        """Mark exactly one row, leaving a sibling of the same sequence alone.

        Used by the v2 log's per-event undo: a penalty shares sequence 0 with
        every other excluded event, so deleting by sequence would wipe them
        all.
        """
        TeamLog.objects.filter(gameinfo=self.gameinfo, pk=team_log_id).update(
            isDeleted=True, updated_at=timezone.now()
        )


class Half(object):
    def __init__(self):
        self.score = None
        self.entries = []

    def as_json(self):
        return dict(score=self.score, entries=self.entries)


class Team(object):
    def __init__(self, name, id=None):
        self.id = id
        self.name = name
        self.score = None
        self.firsthalf = Half()
        self.secondhalf = Half()

    def as_json(self):
        return dict(
            id=self.id,
            name=self.name,
            score=self.score,
            firsthalf=self.firsthalf,
            secondhalf=self.secondhalf,
        )


class GameLogObject(object):
    def __init__(self, gameId, home, away, home_id=None, away_id=None):
        self.gameId = gameId
        self.home = Team(home, home_id)
        self.away = Team(away, away_id)
        self.is_first_half = True
        self.in_possession = None
        self.events = []

    def as_json(self):
        return dict(
            gameId=self.gameId,
            isFirstHalf=self.is_first_half,
            inPossession=self.in_possession,
            events=self.events,
            home=self.home,
            away=self.away,
        )
