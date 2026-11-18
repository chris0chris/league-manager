import json
import logging
import uuid
from collections import OrderedDict
from http import HTTPStatus

from django.db import transaction
from django.db.models import F, Max, Q
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.generics import UpdateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gameevents.models import GameEvent
from gameevents.service.append import append_legacy as shadow_append
from gameevents.service.log_payload import (
    event_payloads_for_rows,
    event_seqs_for_rows,
)
from gameevents.service.projector import InvalidEnvelope
from gameevents.service.rules import load_rules, penalty_catalogue
from gameevents.service.undo import record_legacy_undo
from gamedays.api.serializers import (
    GamedaySerializer,
    GameFinalizer,
    GameSetupSerializer,
    GameLogSerializer,
)
from gamedays.models import (
    Team,
    Gameinfo,
    GameSetup,
    GameLogSubmission,
    Gameresult,
    TeamLog,
)
from gamedays.service.device_lock import release_device_lock, stored_device
from gamedays.service.game_service import GameService
from gamedays.service.gamelog import gameday_ref_now, serialize_events
from gamedays.service.wrapper.gameinfo_wrapper import IllegalGameTransition
from gamedays.service.gameday_service import GamedayService
from gamedays.service.model_helper import GameresultHelper, TeamLogHelper
from passcheck.models import PasscheckVerification, PlayerlistGameday

logger = logging.getLogger(__name__)

DEVICE_LOCK_DETAIL = "Dieses Spiel läuft auf einem anderen Gerät."
GAME_FINISHED_DETAIL = "Dieses Spiel ist beendet."


def _finished_game_response(game) -> Response | None:
    """409 once a game is `beendet`, ``None`` while it is still open.

    A finished game is the final word: the old app navigates away from the
    scorecard after the result, and v2 must not append to (or undo) a log the
    result already covers. Clients replay their queue, so this is the guard
    that a stale tab or a late flush runs into — not a silent extra row.
    """
    if str(getattr(game, "status", "") or "").strip().lower() == "beendet":
        return Response(
            {"detail": GAME_FINISHED_DETAIL},
            status=HTTPStatus.CONFLICT,
        )
    return None


def _device_conflict(stored: str, incoming: str):
    """409 when ``incoming`` may not write, ``None`` when it may.

    An empty ``incoming`` is the old app (it sends no device at all) and is
    always allowed; the first non-empty id wins and only staff can release it.
    """
    if incoming and stored and incoming != stored:
        return Response(
            {"detail": DEVICE_LOCK_DETAIL, "device_id": stored},
            status=HTTPStatus.CONFLICT,
        )
    return None


def _requested_device(request: Request, data) -> str:
    """The device a write claims: the header first, then the body.

    The v2 client sends both (`X-Scorecard-Device` on every request and
    ``device_id`` in the setup payload); the old app sends neither.
    """
    device = request.headers.get("X-Scorecard-Device") or data.get("device_id")
    return str(device).strip() if device else ""


def _device_lock_response(request: Request, game_id, data=None):
    """409 when the calling device may not write this game, else ``None``.

    Every write to a game goes through this: a stale second tab must not be
    able to undo, start the second half, set possession or finalize a game
    that another device holds. A missing device id is still allowed (old app).
    """
    return _device_conflict(
        stored_device(game_id),
        _requested_device(request, request.data if data is None else data),
    )


def _client_id(raw):
    """``None`` when no id was sent (old app), a UUID, or a 400."""
    if raw in (None, ""):
        return None
    try:
        # A padded id (copy/paste, sloppy serializer) is still that id.
        return uuid.UUID(str(raw).strip())
    except (AttributeError, TypeError, ValueError):
        raise ValidationError({"client_id": "must be a UUID"})


def _submission_already_applied(game, client_id) -> bool:
    """Whether this submission has already written its rows.

    Both write endpoints accept the same outbox, and a retried op can land on
    the other one (the app moves from ``/api/gamelog/`` to
    ``/api/game/<id>/events`` between releases). The claim therefore has two
    homes: ``GameLogSubmission`` for the writes this endpoint took, and the
    event store's unique ``(game, client_id)`` for the ones the canonical
    endpoint took (which the shadow also records here). Checking only the
    former would write a canonical submission's ``TeamLog`` rows a second time
    on a replay; checking only the latter would do the same for a legacy one.
    """
    if client_id is None:
        return False
    if GameLogSubmission.objects.filter(gameinfo=game, client_id=client_id).exists():
        return True
    return GameEvent.objects.filter(game=game, client_id=str(client_id)).exists()


def _validate_gamelog_payload(data):
    """Reject malformed gamelog write payloads with a 400 instead of a 500.

    The scorecard posts ``event`` as a list of ``{name, player?, input?}``
    objects and ``half`` as ``1``/``2``. Anything else (e.g. a bare-string
    event that ``GameLogCreator`` would iterate char-by-char, or a half that
    cannot be stored) is client error, not server failure (#1980 F1).
    """
    event = data.get("event")
    half = data.get("half")
    if not isinstance(event, list) or not event:
        raise ValidationError({"event": "must be a non-empty list of event objects"})
    for entry in event:
        if not isinstance(entry, dict):
            raise ValidationError({"event": "each entry must be an object"})
        name = entry.get("name")
        if not isinstance(name, str) or not name:
            raise ValidationError({"event": "each entry must have a non-empty 'name'"})
    if half not in (1, 2):
        raise ValidationError({"half": "must be 1 or 2"})


class GameLogAPIView(APIView):

    def get(self, request: Request, *args, **kwargs):
        game_id = kwargs.get("id")
        if request.query_params.get("other") is not None:
            try:
                gamelog = GameService(game_id).get_gamelog()
                return Response(
                    json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict)
                )
            except Gameinfo.DoesNotExist:
                raise NotFound(detail=f"No game found for gameId {game_id}")
        gamelog = (
            Gameinfo.objects.filter(id=game_id)
            .annotate(
                home_id=GameresultHelper.get_gameresult_team_subquery(
                    is_home=True, team_column="id"
                ),
                home=GameresultHelper.get_gameresult_team_subquery(
                    is_home=True, team_column="name"
                ),
                away_id=GameresultHelper.get_gameresult_team_subquery(
                    is_home=False, team_column="id"
                ),
                away=GameresultHelper.get_gameresult_team_subquery(
                    is_home=False, team_column="name"
                ),
                score_home_overall=GameresultHelper.get_gameresult_score(
                    True, True, True
                ),
                score_home_fh=GameresultHelper.get_gameresult_score(True, is_fh=True),
                score_home_sh=GameresultHelper.get_gameresult_score(True, is_sh=True),
                score_away_overall=GameresultHelper.get_gameresult_score(
                    False, True, True
                ),
                score_away_fh=GameresultHelper.get_gameresult_score(False, is_fh=True),
                score_away_sh=GameresultHelper.get_gameresult_score(False, is_sh=True),
                gameday_date=F("gameday__date"),
                inPossession=F("in_possession"),
            )
            .values(
                *GameLogSerializer.ALL_FIELD_VALUES,
                "home_id",
                "away_id",
                GameLogSerializer.GAMEDAY_DATE,
            )
        )
        if not gamelog.exists():
            raise NotFound(detail=f"No game found for gameId {game_id}")
        gamelog = list(gamelog)[0]
        if not gamelog.get(GameLogSerializer.IN_POSSESSION):
            # A blank stored value means "no possession", not "the empty team".
            gamelog[GameLogSerializer.IN_POSSESSION] = None
        rows = list(TeamLog.objects.filter(gameinfo_id=game_id))
        gamelog.update(
            {
                GameLogSerializer.EVENTS: serialize_events(
                    rows,
                    {
                        gamelog.get("home_id"): gamelog.get(
                            GameLogSerializer.HOME_TEAM
                        ),
                        gamelog.get("away_id"): gamelog.get(
                            GameLogSerializer.AWAY_TEAM
                        ),
                    },
                    gameday_ref_now(gamelog.get(GameLogSerializer.GAMEDAY_DATE)),
                    event_seqs_for_rows(rows, game_id),
                    payload_by_row=event_payloads_for_rows(rows, game_id),
                )
            }
        )
        gamelog.update(
            {
                GameLogSerializer.TEAMLOG_HOME: list(
                    TeamLog.objects.filter(gameinfo=game_id, team=gamelog["home_id"])
                    .exclude(event__in=TeamLogHelper.EXCLUDED_EVENTS)
                    .order_by("-sequence")
                    .values()
                )
            }
        )
        gamelog.update(
            {
                GameLogSerializer.TEAMLOG_AWAY: list(
                    TeamLog.objects.filter(gameinfo=game_id, team=gamelog["away_id"])
                    .exclude(event__in=TeamLogHelper.EXCLUDED_EVENTS)
                    .order_by("-sequence")
                    .values()
                )
            }
        )
        return Response(GameLogSerializer(instance=gamelog).data)

    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            _validate_gamelog_payload(data)
            client_id = _client_id(data.get("client_id"))
            with transaction.atomic():
                # Rows and events are one unit. Locking the game row before the
                # write serialises this endpoint with the canonical endpoint's
                # sequence allocation; GameLogCreator re-locks the same row
                # inside the write (a no-op in this transaction), so every
                # write here holds Gameinfo before Gameresult.
                game = Gameinfo.objects.select_for_update().get(pk=data.get("gameId"))
                game_service = GameService(game.pk)
                if _submission_already_applied(game, client_id):
                    # Already applied (and its rows committed -- the claim shares
                    # the write's transaction). Answer with the current log and
                    # write nothing. This has to be checked BEFORE the device
                    # lock: after a staff release plus a handover the replay comes
                    # from a device that no longer holds the lock, and a 409 would
                    # pin the op in the outbox forever, blocking the finalize.
                    return Response(
                        json.loads(
                            game_service.get_gamelog().as_json(),
                            object_pairs_hook=OrderedDict,
                        ),
                        status=HTTPStatus.OK,
                    )
                finished = _finished_game_response(game)
                if finished is not None:
                    return finished
                conflict = _device_lock_response(request, game.pk, data)
                if conflict is not None:
                    return conflict
                # The rows this request writes are the ones above this
                # watermark: the game row is locked for the whole request, so
                # no other writer can insert in between. They are handed to the
                # shadow so each event can name the row it produced.
                watermark = (
                    TeamLog.objects.filter(gameinfo=game).aggregate(Max("pk"))[
                        "pk__max"
                    ]
                    or 0
                )
                gamelog, applied = game_service.create_gamelog_once(
                    data.get("team"),
                    data.get("event"),
                    request.user,
                    data.get("half"),
                    client_id=client_id,
                )
                written = list(
                    TeamLog.objects.filter(gameinfo=game, pk__gt=watermark).order_by(
                        "pk"
                    )
                )
                # The legacy writer already inserted the TeamLog rows, so the
                # shadow records the events only (write_rows=False) and moves
                # GameState to their projection.
                shadow_append(
                    game,
                    # The legacy body may carry a pk, a name or the description
                    # (v1 posts names); resolve it exactly like the writer did
                    # so the shadow records the same side.
                    team=GameService._resolve_team(data.get("team")),
                    entries=data.get("event"),
                    half=data.get("half"),
                    # _client_id normalises to a UUID; the event store stores
                    # it as text (and the outbox ids are UUID strings).
                    client_id=str(client_id) if client_id is not None else None,
                    author=request.user,
                    rows=written,
                )
            # Serialize *after* the shadow append: ``GameLog`` builds its
            # ``events`` list lazily, and the rows just written only carry
            # their event ``seq`` once ``append_legacy`` has linked them. The
            # answer a client gets for its own write is therefore complete --
            # do not move this call inside the block above.
            return Response(
                json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict),
                # A repeated submission wrote nothing, so it is a 200.
                status=HTTPStatus.CREATED if applied else HTTPStatus.OK,
            )
        except Gameinfo.DoesNotExist:
            raise NotFound(
                detail=f'Could not create team logs ... gameId {request.data.get("gameId")} not found'
            )
        except Team.DoesNotExist:
            raise NotFound(
                detail=f'Could not create team logs ... team {request.data.get("team")} not found'
            )
        except InvalidEnvelope as error:
            # An event name the store cannot represent (e.g. a client typo):
            # the whole request is rolled back, rows included.
            return Response({"detail": str(error)}, status=HTTPStatus.BAD_REQUEST)

    def delete(self, request: Request, *args, **kwargs):
        game_id = kwargs.get("id")
        sequence = request.data.get("sequence")
        team_log_id = request.data.get("team_log_id")
        has_sequence = sequence is not None
        has_team_log_id = team_log_id is not None
        if has_sequence == has_team_log_id:
            raise ValidationError(
                {
                    "detail": "Send exactly one of 'sequence' (whole play) or "
                    "'team_log_id' (one row)."
                }
            )
        # One transaction: the legacy delete and the correction event that
        # records it are both or neither, and locking the game row serialises
        # this with both append paths' sequence allocation.
        with transaction.atomic():
            try:
                game = Gameinfo.objects.select_for_update().get(pk=game_id)
            except Gameinfo.DoesNotExist:
                raise NotFound(
                    detail=f"Could not delete team logs ... gameId {game_id} not found"
                )
            # A finished game cannot be undone: the result already covers the log.
            finished = _finished_game_response(game)
            if finished is not None:
                return finished
            # Undo is a write like any other: a stale second tab must not delete
            # entries of a game another device holds.
            conflict = _device_lock_response(request, game.pk)
            if conflict is not None:
                return conflict
            game_service = GameService(game_id)
            if has_team_log_id:
                # The v2 log undoes one row at a time: a penalty (sequence 0) must
                # not take every timeout of the game with it.
                try:
                    team_log_id = int(team_log_id)
                except (TypeError, ValueError):
                    raise ValidationError({"team_log_id": "must be an integer"})
                row = TeamLog.objects.filter(gameinfo=game, pk=team_log_id).first()
                if row is None:
                    raise NotFound(
                        detail=f"Could not delete team log {team_log_id} of game {game_id}"
                    )
                if not self._can_delete_team_log(request.user, game, row):
                    raise PermissionDenied(
                        detail="You do not have permission to delete this game log entry."
                    )
                gamelog = game_service.delete_gamelog_entry(row.pk)
                record_legacy_undo(game, team_log_id=row.pk, author=request.user)
            else:
                if not self._can_delete_log_entry(request.user, game, sequence):
                    raise PermissionDenied(
                        detail="You do not have permission to delete this game log entry."
                    )
                gamelog = game_service.delete_gamelog(sequence)
                # The rows are deleted; the log must say so too, or GameState
                # keeps a score the rows no longer have.
                record_legacy_undo(game, sequence=sequence, author=request.user)
        return Response(
            json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict),
            status=HTTPStatus.OK,
        )

    @staticmethod
    def _can_delete_log_entry(user, game: Gameinfo, sequence) -> bool:
        """Whether the user may delete a log entry.

        Allowed for staff, the gameday author, or the user who recorded the
        entry (so on-site scorecard officials can still undo their own
        mistakes while unrelated authenticated users cannot tamper with the
        log).
        """
        if not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        if game.gameday.author_id == user.pk:
            return True
        return TeamLog.objects.filter(
            gameinfo=game, sequence=sequence, isDeleted=False, author=user
        ).exists()

    @staticmethod
    def _can_delete_team_log(user, game: Gameinfo, row: TeamLog) -> bool:
        """The same permission rule as {@link _can_delete_log_entry}, per row."""
        if not user.is_authenticated:
            return False
        if user.is_staff:
            return True
        if game.gameday.author_id == user.pk:
            return True
        return not row.isDeleted and row.author_id == user.pk


class GameHalftimeAPIView(APIView):
    def put(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        try:
            game_service = GameService(pk)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f"No game found for gameId {pk}")
        conflict = _device_lock_response(request, pk)
        if conflict is not None:
            return conflict
        try:
            game_service.update_halftime(request.user)
        except IllegalGameTransition as e:
            logger.warning(
                "Rejected halftime transition for game %s: %s", kwargs.get("pk"), e
            )
            return Response(
                {"detail": "Dieser Spielstatus erlaubt keine Halbzeit."},
                status=HTTPStatus.CONFLICT,
            )
        return Response()


class GameFinalizeUpdateView(UpdateAPIView):
    serializer_class = GameFinalizer
    queryset = GameSetup.objects.all()

    def update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        try:
            game_service = GameService(pk)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f"No game found for gameId {pk}")
        conflict = _device_lock_response(request, pk)
        if conflict is not None:
            return conflict
        try:
            game_service.update_game_finished(request.user)
        except IllegalGameTransition as e:
            logger.warning("Rejected finalize for game %s: %s", pk, e)
            return Response(
                {"detail": "Dieser Spielstatus erlaubt kein Spielende."},
                status=HTTPStatus.CONFLICT,
            )
        # Historic duplicate setup rows must not raise MultipleObjectsReturned.
        game_setup = GameSetup.objects.filter(gameinfo_id=pk).order_by("pk").first()
        if game_setup is None:
            game_setup = GameSetup.objects.create(gameinfo_id=pk)
        serializer = GameFinalizer(instance=game_setup, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=HTTPStatus.OK)
        else:
            return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class GameSetupCreateOrUpdateView(RetrieveUpdateAPIView):
    serializer_class = GameSetupSerializer
    queryset = GameSetup.objects.all()

    def get(self, request, *args, **kwargs):
        game_id = kwargs.get("pk")
        # ``order_by("pk").first()`` instead of ``get``: a historic duplicate
        # setup row must not 500 this read.
        game_setup = (
            GameSetup.objects.filter(gameinfo_id=game_id).order_by("pk").first()
        )
        if game_setup is None:
            return Response(data={}, status=HTTPStatus.OK)
        serializer = GameSetupSerializer(game_setup)
        data = dict(serializer.data)
        device = _requested_device(request, {})
        if device:
            # A v2 device learns on open that another device holds the game,
            # not on its first write. The stored id stays write-only, and the
            # v1 client (no device header) keeps its body unchanged.
            data["locked_elsewhere"] = (
                _device_conflict(game_setup.device_id, device) is not None
            )
            # Whether this user may lift the lock (``DELETE .../device``):
            # the screen only offers "Spiel übernehmen" then; the endpoint
            # keeps enforcing it.
            data["can_release_lock"] = bool(request.user.is_staff)
        return Response(data, status=HTTPStatus.OK)

    def update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        try:
            with transaction.atomic():
                # Serialize EVERY setup write for this game on the game row
                # itself. ``GameSetup.gameinfo`` has no unique constraint, so
                # two concurrent first-time PUTs could otherwise both see "no
                # row yet" and each create one (no migration is added for this,
                # because existing databases may already hold duplicates).
                # Locking the Gameinfo row keeps the device check, the
                # transition and the row creation one-after-another.
                Gameinfo.objects.select_for_update().get(pk=pk)
                game_setup = (
                    GameSetup.objects.filter(gameinfo_id=pk).order_by("pk").first()
                )
                serializer = GameSetupSerializer(instance=game_setup, data=request.data)
                # Validate before touching anything: a malformed payload must
                # not leave a setup row behind (it would make the game look
                # prepared).
                if not serializer.is_valid():
                    return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)

                incoming_device = _requested_device(request, serializer.validated_data)
                conflict = _device_conflict(
                    game_setup.device_id if game_setup is not None else "",
                    incoming_device,
                )
                if conflict is not None:
                    return conflict
                if incoming_device:
                    # Store the normalised id (stripped, header wins over the
                    # body) so later reads compare like with like.
                    serializer.validated_data["device_id"] = incoming_device
                elif "device_id" in serializer.validated_data:
                    # ``null``/blank is never a device: store the empty value
                    # instead of NULL, and never treat it as a release.
                    serializer.validated_data["device_id"] = ""
                if game_setup is None:
                    # Starting the game, writing its log entry and creating
                    # the setup row are one unit. A rejected transition (409)
                    # must roll back to the state before the request,
                    # otherwise the retry sees an existing row and silently
                    # skips `update_gamestart` -- returning 200 for a game
                    # that never started.
                    GameService(pk).update_gamestart(request.user)
                    serializer.save(gameinfo_id=pk)
                else:
                    if game_setup.device_id and not incoming_device:
                        # The first non-empty id wins: a blank field (or an
                        # absent one) must never release the lock.
                        serializer.validated_data.pop("device_id", None)
                    serializer.save()
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f"No game found for gameId {pk}")
        except IllegalGameTransition as e:
            logger.warning("Rejected gamestart for game %s: %s", pk, e)
            return Response(
                {"detail": "Dieser Spielstatus erlaubt keinen Spielstart."},
                status=HTTPStatus.CONFLICT,
            )
        return Response(serializer.data, status=HTTPStatus.OK)


class GameDeviceLockAPIView(APIView):
    """Release the device lock of a game (staff only).

    Without this a lost or replaced phone would lock the game for good.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied(
                detail="Nur die Turnierleitung kann die Gerätesperre aufheben."
            )
        pk = kwargs.get("pk")
        try:
            game = Gameinfo.objects.get(pk=pk)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f"No game found for gameId {pk}")
        game_setup = GameSetup.objects.filter(gameinfo=game).order_by("pk").first()
        if game_setup is None:
            raise NotFound(detail=f"No game setup found for gameId {pk}")
        release_device_lock(pk)
        return Response(status=HTTPStatus.NO_CONTENT)


class GamesToWhistleAPIView(APIView):
    def get(self, request, *args, **kwargs):
        gs = GamedayService.create(kwargs["pk"])
        games_to_whistle = gs.get_games_to_whistle(kwargs.get("team"))
        games_to_whistle = games_to_whistle.to_json(orient="records")
        games_to_whistle = json.loads(games_to_whistle, object_pairs_hook=OrderedDict)
        self._annotate_passcheck(games_to_whistle, kwargs["pk"])
        return Response(games_to_whistle)

    @staticmethod
    def _annotate_passcheck(games_to_whistle, gameday_id):
        """Add the passcheck state the scorecard game list renders.

        ``PasscheckVerification`` holds one row per verified team per gameday;
        a game is fully checked only when both of its teams are verified.

        Caution: the pandas merge in ``GamedayModelWrapper`` keeps both ``id``
        columns, and ``id_home``/``id_away`` are the renamed ``Gameresult`` pks
        (``id_y``) — not ``Team`` pks. They arrive as strings (``""`` for an
        unresolved bracket placeholder), so the lookup keys are stringified.
        """
        game_ids = [game["id"] for game in games_to_whistle]
        team_by_result = {
            str(result_id): team_id
            for result_id, team_id in Gameresult.objects.filter(
                gameinfo_id__in=game_ids
            ).values_list("id", "team_id")
        }
        verified = set(
            PasscheckVerification.objects.filter(gameday_id=gameday_id).values_list(
                "team_id", flat=True
            )
        )
        for game in games_to_whistle:
            home = team_by_result.get(str(game.get("id_home", "")))
            away = team_by_result.get(str(game.get("id_away", "")))
            game["passcheck"] = home in verified and away in verified


class GameSummaryAPIView(APIView):
    """One game with its gameday, for the scorecard's deep link.

    The field app is a single page and normally reaches a game through its
    gameday, so a link that names the game directly needs the game row (field,
    stage, teams, status, passcheck) and the gameday it belongs to.

    The row is built from the game itself, not from the games-to-whistle list:
    that list only holds games still to be played, and the organisation opens
    a deep link *after* the game more often than before it. A finished game must
    answer here, or the link would 404 exactly when it is needed.

    Authenticated on purpose: the link opens the scorecard, which is
    login-gated, and the row carries the crew.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            game = Gameinfo.objects.select_related("gameday__league").get(pk=pk)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f"No game found for gameId {pk}")

        row = self._row(game)
        GamesToWhistleAPIView._annotate_passcheck([row], game.gameday_id)
        return Response(
            {
                "game": row,
                "gameday": GamedaySerializer(game.gameday).data,
            }
        )

    @staticmethod
    def _row(game) -> dict:
        """The game in the shape the games list sends (``Game`` on the client)."""

        results = {
            result.isHome: result
            for result in game.gameresult_set.select_related("team")
        }
        home = results.get(True)
        away = results.get(False)

        def team_name(result):
            return result.team.description if result and result.team else None

        def points(result):
            if result is None or (result.fh is None and result.sh is None):
                return None
            return (result.fh or 0) + (result.sh or 0)

        return {
            "id": game.pk,
            "scheduled": game.scheduled.strftime("%H:%M:%S"),
            "field": game.field,
            "officials": game.officials.name if game.officials else "",
            "officialsId": game.officials_id,
            "stage": game.stage,
            "standing": game.standing,
            "home": team_name(home),
            "away": team_name(away),
            "points_home": points(home),
            "points_away": points(away),
            "status": game.status,
            "id_home": str(home.pk) if home else "",
            "id_away": str(away.pk) if away else "",
        }


class GameRosterAPIView(APIView):
    """Jersey plus surname for both teams of a game.

    The touchdown sheet picks players from this list, so it must never leak the
    pass number. ``IsAuthenticated`` is explicit: the DRF default is
    ``IsAuthenticatedOrReadOnly``, which would expose surnames and jerseys to
    anonymous visitors.

    Eligibility mirrors the passcheck (``get_roster_with_validation``): a
    player is active on the gameday date, not merely "currently on the team".
    The ``PlayerlistGameday`` snapshot pins the roster to this day. Duplicate
    jersey numbers are returned as they are — the passcheck validation flags
    that data problem, and hiding a duplicate here would mask it.

    A name is only served for a team whose passcheck was actually done
    (``PasscheckVerification`` for that team and gameday). Without it the rows
    keep the jersey but answer ``name: null``: the snapshot may hold a roster
    the passcheck never confirmed (a seeded gameday, a check-in cancelled
    later), and a number with the wrong surname — field feedback: every number
    of a team showed the same name — is worse than a number with none. The pad
    then shows plain numbers the official types against the paper sheet.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            game = Gameinfo.objects.select_related("gameday").get(pk=pk)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f"No game found for gameId {pk}")

        sides = {
            row["team_id"]: "home" if row["isHome"] else "away"
            for row in Gameresult.objects.filter(
                gameinfo=game, team__isnull=False
            ).values("team_id", "isHome")
        }
        if not sides:  # bracket placeholder: both teams are still unknown
            return Response([])

        # One query for both sides, so the roster stays flat however many
        # players it lists.
        verified = set(
            PasscheckVerification.objects.filter(
                gameday_id=game.gameday_id, team_id__in=sides
            ).values_list("team_id", flat=True)
        )

        rows = (
            PlayerlistGameday.objects.filter(
                gameday_id=game.gameday_id,
                playerlist__team_id__in=sides,
            )
            .filter(playerlist__joined_on__lte=game.gameday.date)
            .filter(
                Q(playerlist__left_on__isnull=True)
                | Q(playerlist__left_on__gt=game.gameday.date)
            )
            .select_related("playerlist__player__person")
        )
        return Response(
            [
                {
                    "side": sides[row.playerlist.team_id],
                    "jersey": row.gameday_jersey,
                    "name": (
                        self._display_name(row.playerlist.player.person)
                        if row.playerlist.team_id in verified
                        else None
                    ),
                }
                for row in sorted(
                    rows,
                    key=lambda row: (
                        sides[row.playerlist.team_id] != "home",
                        row.gameday_jersey,
                        row.playerlist_id,
                    ),
                )
            ]
        )

    @staticmethod
    def _display_name(person):
        return person.last_name or person.first_name or None


class GamePossessionAPIView(APIView):
    def put(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        try:
            game_service = GameService(pk)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f"No game found for gameId {pk}")
        conflict = _device_lock_response(request, pk)
        if conflict is not None:
            return conflict
        team = request.data.get("team")
        home = Gameresult.objects.get(
            gameinfo=game_service.gameinfo.gameinfo, isHome=True
        ).team
        away = Gameresult.objects.get(
            gameinfo=game_service.gameinfo.gameinfo, isHome=False
        ).team
        valid_teams = {str(home.pk), home.name, str(away.pk), away.name}
        if team not in valid_teams:
            raise ValidationError(
                {"team": f"must be one of the game's teams ({home.name}, {away.name})"}
            )
        game_service.update_team_in_possesion(team)
        return Response()


class ConfigPenalties(APIView):
    """The penalty catalogue, projected from the rule definition.

    The response shape is the one the shipped scorecard reads (``name``,
    ``subtext``, ``isPenaltyAgainstOpponent``); only the definition may add
    rows. See :mod:`gameevents.service.rules`.
    """

    def get(self, request, *args, **kwargs):
        return Response(penalty_catalogue())


class ConfigRules(APIView):
    """The whole sport definition: the values the field app calculates with."""

    def get(self, request, *args, **kwargs):
        return Response(load_rules())
