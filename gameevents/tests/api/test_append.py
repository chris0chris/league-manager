"""The canonical event endpoint ``POST /api/game/<id>/events`` (T3).

Two contracts are pinned here:

- the legacy-shaped body writes exactly the ``TeamLog`` rows the legacy
  endpoint writes for the same payload (the golden table from T2 is reused);
- the envelope body is applied once, in order, and is projected into rows and
  ``GameState`` in the same transaction.
"""

import pytest
from rest_framework.response import Response
from rest_framework.reverse import reverse

from gameevents.models import GameEvent, GameState
from gameevents.service.append import project_game
from gameevents.tests.api.support import (
    db_row_signatures,
    legacy_body,
    lock_device,
    login,
    make_game,
    post_events,
    post_legacy,
    sub_id,
)
from gameevents.tests.golden_cases import GOLDEN_CASES, expected_signature
from gamedays.constants import API_GAME_DEVICE
from gamedays.models import Gameresult, GameSetup, Team, TeamLog


def envelope(
    *,
    seq=None,
    type_="score",
    code="touchdown",
    side="home",
    player=7,
    period=1,
    payload=None,
):
    item = {
        "type": type_,
        "code": code,
        "side": side,
        "player": player,
        "period": period,
        "payload": payload or {},
    }
    if seq is not None:
        item["seq"] = seq
    return item


def state_response(response):
    body = response.json()
    assert set(body) == {"state", "cursor"}
    assert set(body["state"]) == {
        "score_home",
        "score_away",
        "period",
        "in_possession",
        "last_seq",
    }
    assert body["cursor"] == body["state"]["last_seq"]
    return body


# --------------------------------------------------------------------------
# golden: canonical rows == legacy rows
# --------------------------------------------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize("case", GOLDEN_CASES, ids=lambda case: case.name)
def test_the_canonical_rows_equal_the_legacy_rows(client, case):
    legacy_game, legacy_home, legacy_away = make_game(f"legacy-{case.name}")
    canonical_game, canonical_home, canonical_away = make_game(
        f"canonical-{case.name}"
    )
    login(client)
    legacy_team = legacy_home if case.side == "home" else legacy_away
    canonical_team = canonical_home if case.side == "home" else canonical_away

    legacy_response = post_legacy(
        client,
        legacy_game,
        legacy_body(
            legacy_game, legacy_team, case.entries, case.half, sub_id(1)
        ),
    )
    canonical_response = post_events(
        client,
        canonical_game,
        legacy_body(
            canonical_game, canonical_team, case.entries, case.half, sub_id(2)
        ),
    )

    assert legacy_response.status_code == 201
    assert canonical_response.status_code == 201
    expected = expected_signature(case)
    assert db_row_signatures(legacy_game, legacy_home) == expected
    assert db_row_signatures(canonical_game, canonical_home) == expected


@pytest.mark.django_db
def test_the_response_carries_the_projected_state(client):
    game, home, _away = make_game("canonical-state")
    login(client)

    response = post_events(
        client,
        game,
        {
            "events": [
                envelope(code="touchdown"),
                envelope(code="pat1"),
            ],
            "client_id": sub_id(1),
        },
    )

    body = state_response(response)
    assert response.status_code == 201
    assert body["state"] == {
        "score_home": 7,
        "score_away": 0,
        "period": 1,
        "in_possession": None,
        "last_seq": 2,
    }


# --------------------------------------------------------------------------
# idempotency and sequencing
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_a_replayed_submission_is_answered_with_the_current_state(client):
    game, home, _away = make_game("canonical-replay")
    login(client)
    body = legacy_body(
        game, home, [{"name": "Touchdown", "player": "7"}], client_id=sub_id(1)
    )

    assert post_events(client, game, body).status_code == 201
    response = post_events(client, game, body)

    assert response.status_code == 200
    body_json = state_response(response)
    assert body_json["state"]["score_home"] == 6
    assert body_json["state"]["last_seq"] == 1
    assert GameEvent.objects.filter(game=game).count() == 1
    assert TeamLog.objects.filter(gameinfo=game).count() == 1


@pytest.mark.django_db
def test_explicit_sequences_must_be_contiguous(client):
    game, _home, _away = make_game("canonical-gap")
    login(client)

    response = post_events(
        client,
        game,
        {
            "events": [
                envelope(seq=1, code="touchdown"),
                envelope(seq=3, code="pat1"),
            ],
            "client_id": sub_id(1),
        },
    )

    assert response.status_code == 409
    assert response.json() == {"expected_next": 1}
    assert GameEvent.objects.count() == 0
    assert TeamLog.objects.count() == 0


@pytest.mark.django_db
def test_a_backwards_sequence_names_the_expected_next(client):
    game, _home, _away = make_game("canonical-backwards")
    login(client)
    assert post_events(
        client,
        game,
        {"events": [envelope(seq=1, code="touchdown")], "client_id": sub_id(1)},
    ).status_code == 201

    response = post_events(
        client,
        game,
        {"events": [envelope(seq=1, code="pat1")], "client_id": sub_id(2)},
    )

    assert response.status_code == 409
    assert response.json() == {"expected_next": 2}
    assert GameEvent.objects.count() == 1


@pytest.mark.django_db
def test_a_mixed_missing_sequence_is_a_bad_request(client):
    game, _home, _away = make_game("canonical-mixed-seq")
    login(client)

    response = post_events(
        client,
        game,
        {
            "events": [envelope(seq=1), envelope(code="pat1")],
            "client_id": sub_id(1),
        },
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_sequences_are_allocated_when_omitted(client):
    game, _home, _away = make_game("canonical-allocate")
    login(client)

    response = post_events(
        client,
        game,
        {
            "events": [envelope(code="touchdown"), envelope(code="pat1")],
            "client_id": sub_id(1),
        },
    )

    assert response.status_code == 201
    assert list(
        GameEvent.objects.filter(game=game).order_by("seq").values_list("seq", flat=True)
    ) == [1, 2]


# --------------------------------------------------------------------------
# validation: client errors store nothing
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_an_unknown_envelope_code_stores_nothing(client):
    game, _home, _away = make_game("canonical-unknown-code")
    login(client)

    response = post_events(
        client,
        game,
        {"events": [envelope(code="tor")], "client_id": sub_id(1)},
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0
    assert TeamLog.objects.count() == 0
    assert not GameState.objects.filter(game=game).exists()


@pytest.mark.django_db
def test_an_unknown_envelope_type_stores_nothing(client):
    game, _home, _away = make_game("canonical-unknown-type")
    login(client)

    response = post_events(
        client,
        game,
        {"events": [envelope(type_="touchdown")], "client_id": sub_id(1)},
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_an_unknown_legacy_name_on_the_canonical_endpoint_stores_nothing(client):
    game, home, _away = make_game("canonical-unknown-legacy")
    login(client)

    response = post_events(
        client,
        game,
        legacy_body(game, home, [{"name": "Tor"}], client_id=sub_id(1)),
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0
    assert TeamLog.objects.count() == 0


@pytest.mark.django_db
def test_a_body_with_both_shapes_is_rejected(client):
    game, home, _away = make_game("canonical-both")
    login(client)

    response = post_events(
        client,
        game,
        {
            "event": [{"name": "Touchdown", "player": "7"}],
            "events": [envelope()],
            "team": home.pk,
            "half": 1,
        },
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_events_of_one_submission_must_share_a_client_id(client):
    game, _home, _away = make_game("canonical-mixed-ids")
    login(client)

    first = envelope()
    first["client_id"] = "a"
    second = envelope(code="pat1")
    second["client_id"] = "b"
    response = post_events(client, game, {"events": [first, second]})

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_the_request_client_id_must_agree_with_the_events(client):
    game, _home, _away = make_game("canonical-contradicting-ids")
    login(client)

    event = envelope()
    event["client_id"] = "a"
    response = post_events(
        client, game, {"events": [event], "client_id": "b"}
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_a_game_id_that_contradicts_the_url_is_rejected(client):
    game, _home, _away = make_game("canonical-game-id")
    other, _h, _a = make_game("canonical-game-id-other")
    login(client)

    response = post_events(
        client,
        game,
        legacy_body(other, _h, [{"name": "Touchdown", "player": "7"}]),
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_an_unknown_team_is_a_404_without_the_orm_detail(client):
    """``Team.DoesNotExist`` names the ORM object it looked for. The client
    gets a fixed message; the exception must not be echoed (CWE-209)."""

    game, _home, _away = make_game("canonical-unknown-team")
    login(client)
    unknown_team_id = Team.objects.order_by("-pk").first().pk + 1

    response = post_events(
        client,
        game,
        legacy_body(game, unknown_team_id, [{"name": "Touchdown", "player": "7"}]),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "team not found"}
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_the_endpoint_needs_authentication(client):
    game, _home, _away = make_game("canonical-anon")

    response = post_events(client, game, {"events": [envelope()], "client_id": "x"})

    assert response.status_code in (401, 403)
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_a_possession_envelope_moves_the_projected_possession(client):
    game, _home, _away = make_game("canonical-possession")
    login(client)

    response = post_events(
        client,
        game,
        {
            "events": [
                {"type": "possession", "code": "home", "period": 1}
            ],
            "client_id": sub_id(1),
        },
    )

    assert response.status_code == 201
    assert response.json()["state"]["in_possession"] == "home"
    assert TeamLog.objects.filter(gameinfo=game).count() == 0


# --------------------------------------------------------------------------
# corrections
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_undo_deletes_the_play_and_drops_its_score(client):
    game, _home, _away = make_game("canonical-undo")
    login(client)
    assert post_events(
        client,
        game,
        {
            "events": [
                envelope(code="touchdown"),
                envelope(code="pat1"),
            ],
            "client_id": sub_id(1),
        },
    ).status_code == 201

    response = post_events(
        client,
        game,
        {
            "events": [
                {
                    "type": "correction",
                    "code": "undo",
                    "payload": {"undo_of": 1},
                }
            ],
            "client_id": sub_id(2),
        },
    )

    body = state_response(response)
    assert response.status_code == 201
    assert body["state"]["score_home"] == 0
    assert body["state"]["last_seq"] == 3
    assert not TeamLog.objects.filter(gameinfo=game, sequence=1, isDeleted=False).exists()
    assert TeamLog.objects.filter(gameinfo=game, sequence=1).count() == 2
    correction = GameEvent.objects.get(game=game, seq=3)
    assert correction.type == "correction"
    assert correction.undo_of.seq == 1


@pytest.mark.django_db
def test_undo_of_an_undo_restores_the_play_and_its_score(client):
    game, _home, _away = make_game("canonical-undo-undo")
    login(client)
    post_events(
        client,
        game,
        {
            "events": [envelope(code="touchdown"), envelope(code="pat1")],
            "client_id": sub_id(1),
        },
    )
    post_events(
        client,
        game,
        {
            "events": [
                {"type": "correction", "code": "undo", "payload": {"undo_of": 1}}
            ],
            "client_id": sub_id(2),
        },
    )

    response = post_events(
        client,
        game,
        {
            "events": [
                {"type": "correction", "code": "undo", "payload": {"undo_of": 3}}
            ],
            "client_id": sub_id(3),
        },
    )

    assert response.status_code == 201
    assert response.json()["state"]["score_home"] == 7
    assert TeamLog.objects.filter(gameinfo=game, sequence=1).count() == 2
    assert not TeamLog.objects.filter(
        gameinfo=game, sequence=1, isDeleted=True
    ).exists()


@pytest.mark.django_db
def test_a_correction_without_a_target_stores_nothing(client):
    game, _home, _away = make_game("canonical-undo-no-target")
    login(client)

    response = post_events(
        client,
        game,
        {"events": [{"type": "correction", "code": "undo", "payload": {}}]},
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0


@pytest.mark.django_db
def test_a_correction_with_an_unknown_target_stores_nothing(client):
    game, _home, _away = make_game("canonical-undo-bad-target")
    login(client)

    response = post_events(
        client,
        game,
        {
            "events": [
                {"type": "correction", "code": "undo", "payload": {"undo_of": 42}}
            ]
        },
    )

    assert response.status_code == 400
    assert GameEvent.objects.count() == 0


# --------------------------------------------------------------------------
# projection consistency and mixing paths
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_game_state_equals_a_replay_of_the_stored_log(client):
    game, _home, _away = make_game("canonical-replay-state")
    login(client)
    post_events(
        client,
        game,
        {
            "events": [
                envelope(code="touchdown"),
                envelope(code="pat1"),
            ],
            "client_id": sub_id(1),
        },
    )
    post_events(
        client,
        game,
        {
            "events": [
                envelope(type_="penalty", code="Holding", player=5),
                envelope(type_="series", code="first_down", player=8),
            ],
            "client_id": sub_id(2),
        },
    )
    post_events(
        client,
        game,
        {
            "events": [
                {"type": "correction", "code": "undo", "payload": {"undo_of": 1}}
            ],
            "client_id": sub_id(3),
        },
    )

    stored = GameState.objects.get(game=game)
    replayed = project_game(game).state

    assert (
        stored.score_home,
        stored.score_away,
        stored.period,
        stored.in_possession,
        stored.last_seq,
    ) == (
        replayed.score_home,
        replayed.score_away,
        replayed.period,
        replayed.in_possession,
        replayed.last_seq,
    )
    assert stored.score_home == 0
    assert stored.last_seq == 5


@pytest.mark.django_db
def test_a_correction_of_a_shadow_play_deletes_its_real_row_group(client):
    game, home, _away = make_game("canonical-undo-shadow")
    login(client)
    entries = [
        {"name": "Touchdown", "player": "7"},
        {"name": "1-Extra-Punkt", "player": "7"},
    ]

    # Two legacy submissions write TeamLog sequences 1 and 2, while their
    # events carry seqs 1,2 and 3,4 -- the two numbering schemes diverge, and
    # a correction must still delete the group that really exists.
    assert post_legacy(
        client, game, legacy_body(game, home, entries, client_id=sub_id(1))
    ).status_code == 201
    assert post_legacy(
        client, game, legacy_body(game, home, entries, client_id=sub_id(2))
    ).status_code == 201
    assert GameEvent.objects.get(game=game, seq=3).legacy_sequence == 2

    response = post_events(
        client,
        game,
        {
            "events": [
                {"type": "correction", "code": "undo", "payload": {"undo_of": 3}}
            ],
            "client_id": sub_id(3),
        },
    )

    assert response.status_code == 201
    assert response.json()["state"]["score_home"] == 7
    assert not TeamLog.objects.filter(
        gameinfo=game, sequence=2, isDeleted=False
    ).exists()
    assert (
        TeamLog.objects.filter(gameinfo=game, sequence=1, isDeleted=False).count() == 2
    )


@pytest.mark.django_db
def test_a_canonical_game_keeps_accepting_the_legacy_endpoint(client):
    game, home, _away = make_game("canonical-then-legacy")
    login(client)
    assert post_events(
        client,
        game,
        {"events": [envelope(code="touchdown")], "client_id": sub_id(1)},
    ).status_code == 201

    response = post_legacy(
        client,
        game,
        legacy_body(
            game,
            home,
            [{"name": "Touchdown", "player": "9"}],
            client_id=sub_id(2),
        ),
    )

    assert response.status_code == 201
    assert TeamLog.objects.filter(gameinfo=game).count() == 2
    events = list(GameEvent.objects.filter(game=game).order_by("seq"))
    assert [(event.seq, event.source) for event in events] == [
        (1, GameEvent.Source.V2),
        (2, GameEvent.Source.LEGACY),
    ]
    # The canonical path continues after the legacy shadow write.
    response = post_events(
        client,
        game,
        {"events": [envelope(code="pat1", player=9)], "client_id": sub_id(3)},
    )
    assert response.status_code == 201
    assert response.json()["state"]["score_home"] == 13


# --------------------------------------------------------------------------
# device lock: the same helper as the gamelog view, not a second lock
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_the_device_lock_of_the_gamelog_view_is_reused(client, monkeypatch):
    from gamedays.api import game_views

    game, _home, _away = make_game("canonical-lock")
    login(client)
    seen = {}

    def lock(request, game_id, data=None):
        seen["game_id"] = game_id
        return Response({"detail": "other device"}, status=409)

    monkeypatch.setattr(game_views, "_device_lock_response", lock, raising=False)

    response = post_events(
        client, game, {"events": [envelope()], "client_id": sub_id(1)}
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "other device"}
    assert seen["game_id"] == game.pk
    assert GameEvent.objects.count() == 0
    assert TeamLog.objects.count() == 0


@pytest.mark.django_db
def test_a_replay_is_answered_before_the_device_lock(client, monkeypatch):
    from gamedays.api import game_views

    game, _home, _away = make_game("canonical-lock-replay")
    login(client)
    body = {"events": [envelope()], "client_id": sub_id(1)}
    assert post_events(client, game, body).status_code == 201

    monkeypatch.setattr(
        game_views,
        "_device_lock_response",
        lambda request, game_id, data=None: Response({"detail": "lock"}, status=409),
        raising=False,
    )
    response = post_events(client, game, body)

    assert response.status_code == 200
    assert response.json()["state"]["score_home"] == 6


# --------------------------------------------------------------------------
# the merged world: both endpoints answer to the same lock, the same
# finished-game guard and the same submission claim
# --------------------------------------------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize(
    "post", [post_legacy, post_events], ids=["gamelog", "events"]
)
def test_a_second_device_may_not_write_either_endpoint(client, post):
    """The lock is one row and one header, enforced identically on both paths.

    The same legacy body is posted to both endpoints, because that is the
    payload a v2 app may send to either: the device that claimed the game
    writes it, any other device gets the 409 and writes nothing at all.
    """

    game, home, _away = make_game(f"lock-{post.__name__}")
    login(client)
    lock_device(game, "device-a")
    body = legacy_body(
        game, home, [{"name": "Touchdown", "player": "7"}], client_id=sub_id(1)
    )

    refused = post(client, game, body, device="device-b")

    assert refused.status_code == 409
    assert refused.json()["device_id"] == "device-a"
    assert TeamLog.objects.filter(gameinfo=game).count() == 0
    assert GameEvent.objects.filter(game=game).count() == 0
    assert not GameState.objects.filter(game=game).exists()

    accepted = post(client, game, body, device="device-a")

    assert accepted.status_code == 201
    assert TeamLog.objects.filter(gameinfo=game).count() == 1
    assert GameEvent.objects.filter(game=game).count() == 1


@pytest.mark.django_db
def test_a_replay_after_a_staff_release_answers_with_the_log(client):
    """Release + handover, then the original device replays: ``200``.

    Staff releasing the lock (a lost phone) and another device claiming the
    game must not turn an already-applied submission into a 409 -- the op
    would stay in the sender's outbox forever and never be finalised. The
    claim therefore wins over the lock, not the other way round.
    """

    game, home, _away = make_game("gamelog-replay-after-release")
    user = login(client)
    lock_device(game, "device-a")
    body = legacy_body(
        game, home, [{"name": "Touchdown", "player": "7"}], client_id=sub_id(1)
    )
    first = post_legacy(client, game, body, device="device-a")
    assert first.status_code == 201

    user.is_staff = True
    user.save(update_fields=["is_staff"])
    released = client.delete(reverse(API_GAME_DEVICE, kwargs={"pk": game.pk}))
    assert released.status_code == 204
    GameSetup.objects.filter(gameinfo=game).update(device_id="device-b")

    replay = post_legacy(client, game, body, device="device-a")

    assert replay.status_code == 200
    assert replay.json() == first.json()
    assert TeamLog.objects.filter(gameinfo=game).count() == 1
    assert GameEvent.objects.filter(game=game).count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize(
    "post", [post_legacy, post_events], ids=["gamelog", "events"]
)
def test_a_finished_game_refuses_a_new_submission_on_either_endpoint(client, post):
    """A closed game is the final word on both write paths, not just the old one."""

    game, home, _away = make_game(f"finished-{post.__name__}")
    login(client)
    game.status = "beendet"
    game.save(update_fields=["status"])

    response = post(
        client,
        game,
        legacy_body(
            game, home, [{"name": "Touchdown", "player": "7"}], client_id=sub_id(1)
        ),
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Dieses Spiel ist beendet."}
    assert TeamLog.objects.filter(gameinfo=game).count() == 0
    assert GameEvent.objects.filter(game=game).count() == 0


@pytest.mark.django_db
def test_a_replay_of_a_finished_game_is_still_answered(client):
    """The op applied before the final whistle is not pinned by the guard."""

    game, home, _away = make_game("finished-replay")
    login(client)
    body = legacy_body(
        game, home, [{"name": "Touchdown", "player": "7"}], client_id=sub_id(1)
    )
    assert post_events(client, game, body).status_code == 201
    game.status = "beendet"
    game.save(update_fields=["status"])

    replay = post_events(client, game, body)

    assert replay.status_code == 200
    assert replay.json()["state"]["score_home"] == 6
    assert TeamLog.objects.filter(gameinfo=game).count() == 1
    assert GameEvent.objects.filter(game=game).count() == 1


# --------------------------------------------------------------------------
# result table: a canonical submission leaves Gameresult where the legacy
# writer leaves it (the liveticker's live list, league table and finalisation
# all read it)
# --------------------------------------------------------------------------


GAMERESULT_FIELDS = ("fh", "sh", "pa")


def gameresult_signatures(game):
    """The result rows of ``game`` keyed by side (the two games differ by pk)."""

    return [
        ("home" if result.isHome else "away",)
        + tuple(getattr(result, field) for field in GAMERESULT_FIELDS)
        for result in Gameresult.objects.filter(gameinfo=game).order_by("isHome")
    ]


@pytest.mark.django_db
@pytest.mark.parametrize("case", GOLDEN_CASES, ids=lambda case: case.name)
def test_the_canonical_result_table_equals_the_legacy_result_table(client, case):
    legacy_game, legacy_home, legacy_away = make_game(f"legacy-result-{case.name}")
    canonical_game, canonical_home, canonical_away = make_game(
        f"canonical-result-{case.name}"
    )
    login(client)
    legacy_team = legacy_home if case.side == "home" else legacy_away
    canonical_team = canonical_home if case.side == "home" else canonical_away

    assert (
        post_legacy(
            client,
            legacy_game,
            legacy_body(
                legacy_game, legacy_team, case.entries, case.half, sub_id(1)
            ),
        ).status_code
        == 201
    )
    assert (
        post_events(
            client,
            canonical_game,
            legacy_body(
                canonical_game, canonical_team, case.entries, case.half, sub_id(2)
            ),
        ).status_code
        == 201
    )

    assert gameresult_signatures(canonical_game) == gameresult_signatures(legacy_game)


@pytest.mark.django_db
def test_a_missed_try_is_a_value_zero_row(client):
    # "nicht verwandelt" is a row of its own (the statistics read the thrower,
    # the intended receiver and the defender) but it must not score: the
    # attempt keeps the try's name and says in `payload.missed` that it failed.
    game, _home, _away = make_game("missed-try")
    login(client)
    assert (
        post_events(
            client,
            game,
            {
                "events": [envelope(code="touchdown", player=23)],
                "client_id": sub_id(1),
            },
        ).status_code
        == 201
    )

    response = post_events(
        client,
        game,
        {
            "events": [
                envelope(
                    code="pat1",
                    player=23,
                    payload={
                        "missed": True,
                        "qb": 7,
                        "defense": {"player": 11, "deflection": True},
                        "input": "nicht verwandelt · QB #7 · Deflection #11",
                    },
                )
            ],
            "client_id": sub_id(2),
        },
    )

    assert response.status_code == 201
    # The six points of the touchdown stand; the miss adds nothing.
    assert response.json()["state"]["score_home"] == 6
    row = TeamLog.objects.get(gameinfo=game, event="1-Extra-Punkt")
    assert row.value == 0
    assert row.player == 23
    assert row.input == "nicht verwandelt · QB #7 · Deflection #11"
    assert Gameresult.objects.get(gameinfo=game, isHome=True).fh == 6


@pytest.mark.django_db
def test_a_canonical_submission_updates_the_result_table(client):
    game, _home, _away = make_game("canonical-result")
    login(client)

    assert (
        post_events(
            client,
            game,
            {
                "events": [envelope(code="touchdown"), envelope(code="pat1")],
                "client_id": sub_id(1),
            },
        ).status_code
        == 201
    )

    home_result = Gameresult.objects.get(gameinfo=game, isHome=True)
    away_result = Gameresult.objects.get(gameinfo=game, isHome=False)
    assert (home_result.fh, home_result.sh, home_result.pa) == (7, 0, 0)
    assert (away_result.fh, away_result.sh, away_result.pa) == (0, 0, 7)


@pytest.mark.django_db
def test_a_canonical_undo_moves_the_result_table_back(client):
    game, _home, _away = make_game("canonical-result-undo")
    login(client)
    post_events(
        client,
        game,
        {"events": [envelope(code="touchdown")], "client_id": sub_id(1)},
    )
    assert Gameresult.objects.get(gameinfo=game, isHome=True).fh == 6

    assert (
        post_events(
            client,
            game,
            {
                "events": [
                    {"type": "correction", "code": "undo", "payload": {"undo_of": 1}}
                ],
                "client_id": sub_id(2),
            },
        ).status_code
        == 201
    )

    home_result = Gameresult.objects.get(gameinfo=game, isHome=True)
    assert (home_result.fh, home_result.sh) == (0, 0)
    assert Gameresult.objects.get(gameinfo=game, isHome=False).pa == 0
