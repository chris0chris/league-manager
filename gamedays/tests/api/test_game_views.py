import json
import pathlib
import re
from datetime import timedelta, time
from http import HTTPStatus
from uuid import uuid4

from django.contrib.auth.models import User
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django_webtest import WebTest
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from gamedays.api.game_views import GamesToWhistleAPIView
from gamedays.constants import (
    API_GAMELOG,
    API_CONFIG_SCORECARD_PENALTIES,
    API_CONFIG_SCORECARD_RULES,
    API_GAME_POSSESSION,
    API_GAME_FINALIZE,
    API_GAME_HALFTIME,
    API_GAME_OFFICIALS,
    API_GAME_SETUP,
    API_GAMEDAY_WHISTLEGAMES,
)
from gamedays.models import Gameinfo, Gameresult, GameOfficial, GameSetup, TeamLog, Team
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import PersonFactory
from passcheck.models import PasscheckVerification
from passcheck.tests.setup_factories.factories_passcheck import (
    PlayerFactory,
    PlayerlistFactory,
    PlayerlistGamedayFactory,
)
from gamedays.tests.setup_factories.request_caches import pin_request_path_caches


class TestRetrieveUpdateOfficials(WebTest):

    def test_create_officials(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        assert len(GameOfficial.objects.all()) == 0
        response = self.app.put_json(
            reverse(API_GAME_OFFICIALS, kwargs={"pk": last_game.pk}),
            [
                {"name": "Saskia", "position": "referee"},
                {"name": "Franz", "position": "side jude"},
            ],
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        assert len(GameOfficial.objects.all()) == 2

    def test_officials_will_be_updated(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        DBSetup().create_game_officials(last_game)
        assert len(GameOfficial.objects.all()) == 5
        response = self.app.put_json(
            reverse(API_GAME_OFFICIALS, kwargs={"pk": last_game.pk}),
            [
                {"name": "Saskia", "position": "Referee"},
                {"name": "Franz", "position": "Side Judge"},
            ],
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        assert len(GameOfficial.objects.all()) == 5

    def test_officials_get(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        DBSetup().create_game_officials(last_game)
        response = self.app.get(
            reverse(API_GAME_OFFICIALS, kwargs={"pk": last_game.pk})
        )
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 5


class TestGameSetup(WebTest):

    def test_game_setup_create(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.last()
        gamesetup = {
            "ctResult": "won",
            "direction": "arrow_forward",
            "fhPossession": "HOME",
        }
        assert len(GameSetup.objects.all()) == 0
        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": first_game.pk}),
            gamesetup,
            headers=DBSetup().get_token_header(),
        )
        assert len(GameSetup.objects.all()) == 1
        assert response.status_code == HTTPStatus.OK
        assert response.json == {**gamesetup, "qbHome": None, "qbAway": None}
        first_game: Gameinfo = Gameinfo.objects.last()
        assert first_game.status == "1. Halbzeit"

    def test_game_setup_stores_the_quarterbacks(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.last()
        payload = {
            "ctResult": "won",
            "direction": "arrow_forward",
            "fhPossession": "HOME",
            "qbHome": 7,
            "qbAway": 12,
        }

        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            payload,
            headers=DBSetup().get_token_header(),
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json == payload
        setup = GameSetup.objects.get(gameinfo=game)
        assert setup.qbHome == 7
        assert setup.qbAway == 12
        # A later device reads them with the rest of the setup.
        read = self.app.get(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            headers=DBSetup().get_token_header(),
        )
        assert read.json["qbHome"] == 7
        assert read.json["qbAway"] == 12

    def test_game_setup_update(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.last()
        first_game.status = "2. Halbzeit"
        first_game.gameStarted = "11:00"
        first_game.save()
        DBSetup().create_gamesetup(first_game)

        gamesetup = {
            "ctResult": "won",
            "direction": "arrow_forward",
            "fhPossession": "HOME",
        }
        assert len(GameSetup.objects.all()) == 1
        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": first_game.pk}),
            gamesetup,
            headers=DBSetup().get_token_header(),
        )
        assert len(GameSetup.objects.all()) == 1
        assert response.status_code == HTTPStatus.OK
        assert response.json == {**gamesetup, "qbHome": None, "qbAway": None}
        first_game: Gameinfo = Gameinfo.objects.last()
        assert first_game.status == "2. Halbzeit"
        assert str(first_game.gameStarted) == "11:00:00"

    def test_invalid_setup_payload_does_not_create_a_row(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.last()
        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            {
                "ctResult": "won",
                "direction": "x" * 101,
                "fhPossession": "HOME",
            },
            headers=DBSetup().get_token_header(),
            status=HTTPStatus.BAD_REQUEST,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert not GameSetup.objects.filter(gameinfo=game).exists()
        assert Gameinfo.objects.get(pk=game.pk).status != "1. Halbzeit"

    def test_blank_legacy_setup_payload_still_starts_the_game(self):
        """v1 sends its untouched form fields as empty strings."""
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.last()
        assert not GameSetup.objects.filter(gameinfo=game).exists()

        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            {"ctResult": "", "direction": "", "fhPossession": ""},
            headers=DBSetup().get_token_header(),
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json == {
            "ctResult": "",
            "direction": "",
            "fhPossession": "",
            "qbHome": None,
            "qbAway": None,
        }
        setup = GameSetup.objects.get(gameinfo=game)
        assert setup.ctResult == ""
        assert setup.direction == ""
        assert setup.fhPossession == ""
        game.refresh_from_db()
        assert game.status == "1. Halbzeit"

    def test_rejected_start_leaves_no_setup_row(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.last()
        game.status = "1. Halbzeit"
        game.save()
        assert not GameSetup.objects.filter(gameinfo=game).exists()

        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            {
                "ctResult": "won",
                "direction": "arrow_forward",
                "fhPossession": "HOME",
            },
            headers=DBSetup().get_token_header(),
            status=HTTPStatus.CONFLICT,
        )

        assert response.status_code == HTTPStatus.CONFLICT
        assert (
            response.json["detail"] == "Dieser Spielstatus erlaubt keinen Spielstart."
        )
        assert not GameSetup.objects.filter(gameinfo=game).exists()

    def test_game_setup_get(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        DBSetup().create_gamesetup(last_game)
        response = self.app.get(reverse(API_GAME_SETUP, kwargs={"pk": last_game.pk}))
        assert response.status_code == HTTPStatus.OK
        assert response.json == {
            "ctResult": "won",
            "direction": "arrow_forward",
            "fhPossession": "AWAY",
            "qbHome": None,
            "qbAway": None,
        }

    def test_game_setup_not_found_(self):
        response = self.app.get(reverse(API_GAME_SETUP, kwargs={"pk": 666}))
        assert response.status_code == HTTPStatus.OK
        assert response.json == {}

    def test_setup_device_lock_first_device_wins(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.last()

        def put(device_id=None):
            payload = {
                "ctResult": "won",
                "direction": "arrow_forward",
                "fhPossession": "HOME",
            }
            if device_id is not None:
                payload["device_id"] = device_id
            return self.app.put_json(
                reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
                payload,
                headers=DBSetup().get_token_header(),
                expect_errors=True,
            )

        assert put("device-a").status_code == HTTPStatus.OK
        assert GameSetup.objects.get(gameinfo=game).device_id == "device-a"

        conflict = put("device-b")
        assert conflict.status_code == HTTPStatus.CONFLICT
        assert conflict.json == {
            "detail": "Dieses Spiel läuft auf einem anderen Gerät.",
            "device_id": "device-a",
        }
        assert GameSetup.objects.get(gameinfo=game).device_id == "device-a"

        # The device holding the lock (and the old app, which sends none) may
        # keep writing the setup.
        assert put("device-a").status_code == HTTPStatus.OK
        assert put().status_code == HTTPStatus.OK
        assert GameSetup.objects.get(gameinfo=game).device_id == "device-a"

    def test_setup_without_device_id_is_still_accepted(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.last()

        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            {"ctResult": "won", "direction": "arrow_forward", "fhPossession": "HOME"},
            headers=DBSetup().get_token_header(),
        )

        assert response.status_code == HTTPStatus.OK
        assert GameSetup.objects.get(gameinfo=game).device_id == ""

    def test_setup_response_keeps_the_old_contract(self):
        """device_id is write-only: the v1 client must see the same body."""
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.last()

        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            {
                "ctResult": "won",
                "direction": "arrow_forward",
                "fhPossession": "HOME",
                "device_id": "device-a",
            },
            headers=DBSetup().get_token_header(),
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json == {
            "ctResult": "won",
            "direction": "arrow_forward",
            "fhPossession": "HOME",
            "qbHome": None,
            "qbAway": None,
        }
        get_response = self.app.get(reverse(API_GAME_SETUP, kwargs={"pk": game.pk}))
        assert "device_id" not in get_response.json


class TestGameSetupLockRead(WebTest):
    """The setup read tells a v2 device that another device holds the game.

    Without it a second phone only learns about the lock on its first write
    (a 409) and shows a game it cannot record. The flag is only added for a
    request that names its device (``X-Scorecard-Device``), so the v1 client
    keeps its body, and the stored id itself is never exposed.
    """

    def _locked_game(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.last()
        response = self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            {
                "ctResult": "won",
                "direction": "arrow_forward",
                "fhPossession": "HOME",
                "device_id": "device-a",
            },
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        return game

    def _read(self, game, device=None):
        headers = {} if device is None else {"X-Scorecard-Device": device}
        return self.app.get(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}), headers=headers
        )

    def test_another_device_learns_about_the_lock_on_read(self):
        game = self._locked_game()

        body = self._read(game, "device-b").json

        assert body["locked_elsewhere"] is True
        assert "device_id" not in body

    def test_the_holding_device_reads_itself_as_unlocked(self):
        game = self._locked_game()

        assert self._read(game, "device-a").json["locked_elsewhere"] is False

    def test_a_released_lock_reads_as_unlocked(self):
        game = self._locked_game()
        GameSetup.objects.filter(gameinfo=game).update(device_id="")

        assert self._read(game, "device-b").json["locked_elsewhere"] is False

    def test_the_v1_client_keeps_its_body(self):
        game = self._locked_game()

        body = self._read(game).json
        assert "locked_elsewhere" not in body
        assert "can_release_lock" not in body

    def test_only_staff_may_release_the_lock(self):
        game = self._locked_game()

        assert self._read(game, "device-b").json["can_release_lock"] is False

        staff = User.objects.create_user(username="turnierleitung", is_staff=True)
        response = self.app.get(
            reverse(API_GAME_SETUP, kwargs={"pk": game.pk}),
            headers={"X-Scorecard-Device": "device-b"},
            user=staff.username,
        )
        assert response.json["can_release_lock"] is True


class TestGameLog(WebTest):
    @staticmethod
    def without_time(value):
        if isinstance(value, dict):
            return {
                key: TestGameLog.without_time(item)
                for key, item in value.items()
                if key != "time"
            }
        if isinstance(value, list):
            return [TestGameLog.without_time(item) for item in value]
        return value

    def test_game_not_found_exception(self):
        response = self.app.get(
            reverse(API_GAMELOG, kwargs={"id": 666}), expect_errors=True
        )
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_get_team_log(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        response = self.app.get(reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}))
        assert response.status_code == HTTPStatus.OK
        with open(
            pathlib.Path(__file__).parent / "../service/testdata/teamlog.json"
        ) as f:
            expected_gamelog = json.load(f)
        expected_gamelog["gameId"] = gameinfo.pk
        expected_gamelog["home"]["id"] = Gameresult.objects.get(
            gameinfo=gameinfo, isHome=True
        ).team_id
        expected_gamelog["away"]["id"] = Gameresult.objects.get(
            gameinfo=gameinfo, isHome=False
        ).team_id
        payload = response.json
        # The scoring-entry contract is unchanged; the v2 additions (the raw
        # event list and possession) are covered by their own tests below.
        payload.pop("events")
        payload.pop("inPossession")
        assert self.without_time(payload) == expected_gamelog
        for side in ("home", "away"):
            for half in ("firsthalf", "secondhalf"):
                for entry in response.json[side][half]["entries"]:
                    assert entry["time"].endswith("+00:00")

    def test_get_team_log_exposes_possession_and_events(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        gameinfo.in_possession = "Home"
        gameinfo.save()
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=Team.objects.get(name="Home"),
            sequence=0,
            event="Strafe",
            input="Holding Defense",
            player=23,
            half=1,
            author=gameinfo.gameday.author,
            created_time=time(12, 34),
        )

        response = self.app.get(reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}))

        assert response.status_code == HTTPStatus.OK
        payload = response.json
        assert payload["inPossession"] == "Home"
        penalty = next(
            event for event in payload["events"] if event["event"] == "Strafe"
        )
        assert penalty["team"] == "Home"
        assert penalty["input"] == "Holding Defense"
        assert penalty["player"] == 23
        assert penalty["half"] == 1
        assert penalty["cop"] is False
        assert penalty["isDeleted"] is False
        assert penalty["time"].endswith("+00:00")
        assert set(penalty) == {
            "id",
            "sequence",
            "seq",
            "team",
            "event",
            "player",
            "input",
            "half",
            "cop",
            "isDeleted",
            "payload",
            "time",
        }

    def test_get_team_log_events_are_newest_first_by_insertion(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        home = Gameresult.objects.get(gameinfo=gameinfo, isHome=True).team
        author = gameinfo.gameday.author
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home,
            sequence=1,
            event="Touchdown",
            player=7,
            value=6,
            half=1,
            author=author,
            created_time=time(10, 0),
        )
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home,
            sequence=0,
            event="Strafe",
            input="Holding",
            half=1,
            author=author,
            created_time=time(11, 0),
        )

        response = self.app.get(reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}))

        assert response.status_code == HTTPStatus.OK
        assert [event["event"] for event in response.json["events"]] == [
            "Strafe",
            "Touchdown",
        ]

    def test_get_team_log_possession_is_null_when_unset(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        gameinfo.in_possession = ""
        gameinfo.save()

        response = self.app.get(reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}))

        assert response.status_code == HTTPStatus.OK
        assert response.json["inPossession"] is None

    def test_get_team_log_events_order_breaks_equal_times_by_insertion(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        home = Gameresult.objects.get(gameinfo=gameinfo, isHome=True).team
        author = gameinfo.gameday.author
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home,
            sequence=1,
            event="Touchdown",
            player=7,
            value=6,
            half=1,
            author=author,
            created_time=time(12, 0),
        )
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home,
            sequence=0,
            event="Auszeit",
            input="1:30",
            half=1,
            author=author,
            created_time=time(12, 0),
        )

        response = self.app.get(reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}))

        assert response.status_code == HTTPStatus.OK
        assert [event["event"] for event in response.json["events"]] == [
            "Auszeit",
            "Touchdown",
        ]

    def test_get_team_log_events_order_ignores_time_of_day_at_midnight(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        home = Gameresult.objects.get(gameinfo=gameinfo, isHome=True).team
        author = gameinfo.gameday.author
        # Inserted before midnight, then after it: -id keeps the later row
        # first even though its time-of-day is smaller.
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home,
            sequence=1,
            event="Touchdown",
            player=7,
            value=6,
            half=2,
            author=author,
            created_time=time(23, 59),
        )
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home,
            sequence=0,
            event="Auszeit",
            input="1:30",
            half=2,
            author=author,
            created_time=time(0, 5),
        )

        response = self.app.get(reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}))

        assert response.status_code == HTTPStatus.OK
        assert [event["event"] for event in response.json["events"]] == [
            "Auszeit",
            "Touchdown",
        ]

    def test_get_team_log_normalises_empty_event_input(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        home = Gameresult.objects.get(gameinfo=gameinfo, isHome=True).team
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=home,
            sequence=0,
            event="Strafe",
            input="",
            half=1,
            author=gameinfo.gameday.author,
        )

        response = self.app.get(reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}))

        assert response.status_code == HTTPStatus.OK
        assert response.json["events"][0]["input"] is None

    def test_get_team_log_event_query_count_is_flat(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        url = reverse(API_GAMELOG, kwargs={"id": gameinfo.pk})

        # 7 = the log's own queries plus the two reads of the event store that
        # publish each row's `seq` and `payload` (gameevents.service.
        # log_payload). Still flat: one query per request, never one per row.
        pin_request_path_caches()
        with self.assertNumQueries(7):
            assert self.app.get(url).status_code == HTTPStatus.OK

        author = gameinfo.gameday.author
        for team in Gameresult.objects.filter(gameinfo=gameinfo).values_list(
            "team_id", flat=True
        ):
            for index in range(2):
                TeamLog.objects.create(
                    gameinfo=gameinfo,
                    team_id=team,
                    sequence=0,
                    event="Strafe",
                    input=f"Holding {index}",
                    half=1,
                    author=author,
                )

        pin_request_path_caches()
        with self.assertNumQueries(7):
            response = self.app.get(url)
        assert len(response.json["events"]) >= 4

    def test_get_team_log_other_path_exposes_possession_and_events(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        gameinfo.in_possession = "Home"
        gameinfo.save()

        response = self.app.get(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}) + "?other=1"
        )

        assert response.status_code == HTTPStatus.OK
        assert response.json["inPossession"] == "Home"
        assert (
            len(response.json["events"])
            == TeamLog.objects.filter(gameinfo=gameinfo).count()
        )
        assert response.json["events"][0]["event"] == "Spiel beendet"

    def test_post_team_log(self):
        DBSetup().g62_status_empty()
        another_user = DBSetup().create_new_user()
        first_game = Gameinfo.objects.first()
        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": [
                    {"name": "Touchdown", "player": "19"},
                    {"name": "1-Extra-Punkt", "player": "7"},
                ],
            },
            headers=DBSetup().get_token_header(another_user),
        )
        assert response.status_code == HTTPStatus.CREATED
        assert TeamLog.objects.first().author == another_user
        payload = response.json
        assert payload.pop("inPossession") == "A1"
        events = payload.pop("events")
        assert [event["event"] for event in events] == [
            "1-Extra-Punkt",
            "Touchdown",
        ]
        assert {event["team"] for event in events} == {"A1"}
        assert all(event["input"] is None for event in events)
        assert all(event["isDeleted"] is False for event in events)
        assert payload == {
            "away": {
                "id": Team.objects.get(name="A2").pk,
                "firsthalf": {"entries": [], "score": 0},
                "name": "A2",
                "score": 0,
                "secondhalf": {"entries": [], "score": 0},
            },
            "gameId": first_game.pk,
            "home": {
                "id": Team.objects.get(name="A1").pk,
                "firsthalf": {
                    "entries": [{"pat1": 7, "sequence": 1, "td": 19}],
                    "score": 7,
                },
                "name": "A1",
                "score": 7,
                "secondhalf": {"entries": [], "score": 0},
            },
            "isFirstHalf": True,
        }

    def test_post_team_log_with_empty_pat(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": [
                    {"name": "Touchdown", "player": "19"},
                    {"name": "1-Extra-Punkt", "player": ""},
                ],
            },
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.CREATED
        payload = response.json
        assert payload.pop("inPossession") == "A1"
        events = payload.pop("events")
        assert [event["event"] for event in events] == [
            "1-Extra-Punkt",
            "Touchdown",
        ]
        assert [event["team"] for event in events] == ["A1", "A1"]
        assert [event["player"] for event in events] == [None, 19]
        assert all(event["input"] is None for event in events)
        assert payload == {
            "gameId": first_game.pk,
            "away": {
                "id": Team.objects.get(name="A2").pk,
                "name": "A2",
                "score": 0,
                "firsthalf": {"entries": [], "score": 0},
                "secondhalf": {"entries": [], "score": 0},
            },
            "home": {
                "id": Team.objects.get(name="A1").pk,
                "name": "A1",
                # the conversion counts without a jersey (it names nobody)
                "score": 7,
                "firsthalf": {
                    "score": 7,
                    "entries": [{"pat1": None, "sequence": 1, "td": 19}],
                },
                "secondhalf": {"entries": [], "score": 0},
            },
            "isFirstHalf": True,
        }

    def test_post_team_log_rejects_string_event(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": "NotARealEventXYZ",
            },
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_post_team_log_rejects_invalid_half(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": "XX",
                "event": [{"name": "Touchdown", "player": "19"}],
            },
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_post_team_log_rejects_entry_without_name(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": [{"player": "19"}],
            },
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_post_team_log_change_of_possession(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": [{"name": "Turnover"}],
            },
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.CREATED
        payload = response.json
        assert payload.pop("inPossession") == "A1"
        events = payload.pop("events")
        assert len(events) == 1
        assert events[0]["event"] == "Turnover"
        assert events[0]["team"] == "A1"
        assert events[0]["cop"] is True
        assert events[0]["player"] is None
        assert events[0]["input"] is None
        assert payload == {
            "gameId": first_game.pk,
            "isFirstHalf": True,
            "home": {
                "id": Team.objects.get(name="A1").pk,
                "name": "A1",
                "score": 0,
                "firsthalf": {
                    "score": 0,
                    "entries": [{"sequence": 1, "cop": True, "name": "Turnover"}],
                },
                "secondhalf": {"score": 0, "entries": []},
            },
            "away": {
                "id": Team.objects.get(name="A2").pk,
                "name": "A2",
                "score": 0,
                "firsthalf": {"score": 0, "entries": []},
                "secondhalf": {"score": 0, "entries": []},
            },
        }

    def test_post_team_log_updates_score(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        # Start unscored: fixture scores without gamelog entries are kept (#1988).
        Gameresult.objects.filter(gameinfo=first_game).update(fh=None, sh=None, pa=None)
        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": [
                    {"name": "Touchdown", "player": "19"},
                    {"name": "2-Extra-Punkte", "player": "7"},
                ],
            },
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.CREATED
        home: Gameresult = Gameresult.objects.get(gameinfo=first_game, isHome=True)
        away: Gameresult = Gameresult.objects.get(gameinfo=first_game, isHome=False)
        assert home.fh == 8
        assert away.fh == 0

    def test_score_is_updated_with_multiple_entries(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.first()
        # Start unscored: fixture scores without gamelog entries are kept (#1988).
        Gameresult.objects.filter(gameinfo=first_game).update(fh=None, sh=None, pa=None)
        self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": [
                    {"name": "Touchdown", "player": "19"},
                    {"name": "1-Extra-Punkt", "player": "7"},
                ],
            },
            headers=DBSetup().get_token_header(),
        )
        self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": [
                    {"name": "Touchdown", "player": "19"},
                    {"name": "Safety (+2)", "player": "7"},
                ],
            },
            headers=DBSetup().get_token_header(),
        )
        self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A2",
                "gameId": first_game.pk,
                "half": 2,
                "event": [
                    {"name": "Touchdown", "player": "19"},
                    {"name": "2-Extra-Punkte", "player": ""},
                ],
            },
            headers=DBSetup().get_token_header(),
        )
        self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A2",
                "gameId": first_game.pk,
                "half": 2,
                "event": [{"name": "Turnover"}],
            },
            headers=DBSetup().get_token_header(),
        )
        home: Gameresult = Gameresult.objects.get(gameinfo=first_game, isHome=True)
        away: Gameresult = Gameresult.objects.get(gameinfo=first_game, isHome=False)
        assert home.fh == 15
        assert home.sh == 0
        assert away.fh == 0
        # 6 for the touchdown and 2 for the conversion without a number
        assert away.sh == 8

    def test_team_log_entry_is_deleted(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"sequence": 2},
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        json_response = response.json
        assert json_response["home"]["score"] == 34
        assert json_response["home"]["firsthalf"]["entries"][1]["isDeleted"]

    def test_delete_team_log_denied_for_anonymous(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"sequence": 2},
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert not TeamLog.objects.filter(
            gameinfo=gameinfo, sequence=2, isDeleted=True
        ).exists()

    def test_delete_team_log_denied_for_unrelated_user(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        unrelated = DBSetup().create_new_user(username="unrelated", is_staff=False)
        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"sequence": 2},
            headers=DBSetup().get_token_header(unrelated),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN
        assert not TeamLog.objects.filter(
            gameinfo=gameinfo, sequence=2, isDeleted=True
        ).exists()

    def test_delete_team_log_allowed_for_entry_author(self):
        DBSetup().g62_status_empty()
        logger = DBSetup().create_new_user(username="logger", is_staff=False)
        first_game = Gameinfo.objects.first()
        self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {
                "team": "A1",
                "gameId": first_game.pk,
                "half": 1,
                "event": [
                    {"name": "Touchdown", "player": "19"},
                    {"name": "1-Extra-Punkt", "player": "7"},
                ],
            },
            headers=DBSetup().get_token_header(logger),
        )
        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": first_game.pk}),
            {"sequence": 1},
            headers=DBSetup().get_token_header(logger),
        )
        assert response.status_code == HTTPStatus.OK
        assert TeamLog.objects.filter(
            gameinfo=first_game, sequence=1, isDeleted=True
        ).exists()

    def test_delete_team_log_by_row_id_marks_only_that_row(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        touchdown = TeamLog.objects.get(
            gameinfo=gameinfo, sequence=2, event="Touchdown"
        )
        conversion = TeamLog.objects.get(
            gameinfo=gameinfo, sequence=2, event="2-Extra-Punkte"
        )

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"team_log_id": touchdown.pk},
            headers=DBSetup().get_token_header(),
        )

        assert response.status_code == HTTPStatus.OK
        touchdown.refresh_from_db()
        conversion.refresh_from_db()
        assert touchdown.isDeleted
        assert not conversion.isDeleted
        # Touchdown 6 points gone, the sibling conversion stays: 42 - 6.
        assert response.json["home"]["score"] == 36
        events = {event["id"]: event for event in response.json["events"]}
        assert events[touchdown.pk]["isDeleted"] is True
        assert events[conversion.pk]["isDeleted"] is False

    def test_delete_team_log_by_row_id_requires_permission(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        row = TeamLog.objects.filter(gameinfo=gameinfo, event="Touchdown").first()
        unrelated = DBSetup().create_new_user(username="unrelated-row", is_staff=False)

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"team_log_id": row.pk},
            headers=DBSetup().get_token_header(unrelated),
            expect_errors=True,
        )

        assert response.status_code == HTTPStatus.FORBIDDEN
        row.refresh_from_db()
        assert not row.isDeleted

    def test_delete_team_log_by_row_id_allowed_for_the_row_author(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.first()
        logger = DBSetup().create_new_user(username="row-author", is_staff=False)
        row = TeamLog.objects.create(
            gameinfo=game,
            team=Gameresult.objects.get(gameinfo=game, isHome=True).team,
            sequence=0,
            event="Strafe",
            input="Holding",
            half=1,
            author=logger,
        )

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": game.pk}),
            {"team_log_id": row.pk},
            headers=DBSetup().get_token_header(logger),
        )

        assert response.status_code == HTTPStatus.OK
        row.refresh_from_db()
        assert row.isDeleted

    def test_delete_team_log_by_row_id_denied_for_a_different_author(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.first()
        logger = DBSetup().create_new_user(username="row-author-2", is_staff=False)
        other = DBSetup().create_new_user(username="row-other", is_staff=False)
        row = TeamLog.objects.create(
            gameinfo=game,
            team=Gameresult.objects.get(gameinfo=game, isHome=True).team,
            sequence=0,
            event="Strafe",
            input="Holding",
            half=1,
            author=logger,
        )

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": game.pk}),
            {"team_log_id": row.pk},
            headers=DBSetup().get_token_header(other),
            expect_errors=True,
        )

        assert response.status_code == HTTPStatus.FORBIDDEN
        row.refresh_from_db()
        assert not row.isDeleted

    def test_post_team_log_on_a_finished_game_is_rejected(self):
        DBSetup().g62_status_empty()
        game: Gameinfo = Gameinfo.objects.first()
        game.status = "beendet"
        game.save()
        rows_before = TeamLog.objects.filter(gameinfo=game).count()

        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": game.pk}),
            {
                "team": "A1",
                "gameId": game.pk,
                "half": 1,
                "event": [{"name": "Touchdown", "player": "19"}],
            },
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )

        assert response.status_code == HTTPStatus.CONFLICT
        assert response.json == {"detail": "Dieses Spiel ist beendet."}
        assert TeamLog.objects.filter(gameinfo=game).count() == rows_before

    def test_delete_team_log_on_a_finished_game_is_rejected(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        gameinfo.status = "beendet"
        gameinfo.save()
        row = TeamLog.objects.filter(gameinfo=gameinfo, sequence=2).first()

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"sequence": 2},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )

        assert response.status_code == HTTPStatus.CONFLICT
        assert response.json == {"detail": "Dieses Spiel ist beendet."}
        row.refresh_from_db()
        assert not row.isDeleted

    def test_replayed_client_id_on_a_finished_game_still_answers(self):
        # An op applied just before the result, whose answer was lost, is
        # replayed after the game is closed. The replay wrote nothing, so the
        # dedupe must win over the finished guard: a 409 would pin the op in
        # the outbox forever.
        DBSetup().g62_status_empty()
        game: Gameinfo = Gameinfo.objects.first()
        client_id = str(uuid4())
        url = reverse(API_GAMELOG, kwargs={"id": game.pk})
        body = {
            "team": "A1",
            "gameId": game.pk,
            "half": 1,
            "event": [{"name": "First Down"}],
            "client_id": client_id,
        }
        first = self.app.post_json(url, body, headers=DBSetup().get_token_header())
        assert first.status_code == HTTPStatus.CREATED
        rows_after_first = TeamLog.objects.filter(gameinfo=game).count()
        game.status = "beendet"
        game.save()

        replay = self.app.post_json(url, body, headers=DBSetup().get_token_header())

        assert replay.status_code == HTTPStatus.OK
        assert replay.json == first.json
        assert TeamLog.objects.filter(gameinfo=game).count() == rows_after_first

    def test_delete_without_an_identifier_is_a_400(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        deleted_before = set(
            TeamLog.objects.filter(gameinfo=gameinfo, isDeleted=True).values_list(
                "pk", flat=True
            )
        )

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "exactly one" in response.json["detail"].lower()
        assert (
            set(
                TeamLog.objects.filter(gameinfo=gameinfo, isDeleted=True).values_list(
                    "pk", flat=True
                )
            )
            == deleted_before
        )

    def test_delete_with_both_identifiers_is_a_400(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        row = TeamLog.objects.filter(gameinfo=gameinfo, event="Touchdown").first()

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"sequence": 1, "team_log_id": row.pk},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "exactly one" in response.json["detail"].lower()
        row.refresh_from_db()
        assert not row.isDeleted

    def test_delete_with_a_non_integer_row_id_is_a_400(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"team_log_id": "not-an-id"},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "team_log_id" in response.json

    def test_delete_team_log_by_row_id_of_another_game_is_not_found(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        other_game = DBSetup().create_teamlog_home_and_away()
        foreign = TeamLog.objects.filter(gameinfo=other_game).first()

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"team_log_id": foreign.pk},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )

        assert response.status_code == HTTPStatus.NOT_FOUND
        foreign.refresh_from_db()
        assert not foreign.isDeleted

    def test_delete_team_log_by_sequence_is_unchanged(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        TeamLog.objects.create(
            gameinfo=gameinfo,
            team=Team.objects.get(name="Home"),
            sequence=0,
            event="Strafe",
            input="Holding",
            half=1,
            author=gameinfo.gameday.author,
        )

        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": gameinfo.pk}),
            {"sequence": 2},
            headers=DBSetup().get_token_header(),
        )

        assert response.status_code == HTTPStatus.OK
        assert (
            TeamLog.objects.filter(
                gameinfo=gameinfo, sequence=2, isDeleted=False
            ).count()
            == 0
        )
        # Sequence 0 rows (the penalty) are not touched by a play delete.
        assert TeamLog.objects.filter(
            gameinfo=gameinfo, event="Strafe", isDeleted=False
        ).exists()


class TestGameLogQueryCounts(APITestCase):
    def test_delete_team_log_by_row_id_query_count(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.first()
        row = TeamLog.objects.create(
            gameinfo=game,
            team=Gameresult.objects.get(gameinfo=game, isHome=True).team,
            sequence=0,
            event="Strafe",
            input="Holding",
            half=1,
            author=game.gameday.author,
        )
        user = DBSetup().create_new_user(username="row-delete-counter", is_staff=True)
        self.client.force_authenticate(user=user)
        # Warm process-level caches (site config / DB check) so the count is
        # deterministic regardless of test order.
        self.client.get(reverse(API_GAMELOG, kwargs={"id": game.pk}))

        # 54 = 43 (the write itself, device-lock read included)
        #    + 1 for the answered log's per-row `seq` (the event store read);
        #    + 2 for the delete's transaction: SAVEPOINT/RELEASE, because the
        #      undo event and the row delete must commit together;
        #    + 8 for recording the undo: re-reading the row, the live-sibling
        #      check, the lookup of the event that wrote the row (a linked
        #      row is corrected; this one has none), and the reconciliation
        #      flag's SELECT + INSERT (each in a savepoint). This row is a
        #      sequence-0 penalty no event produced, so the log admits it
        #      cannot represent the undo instead of inventing history.
        pin_request_path_caches()
        with self.assertNumQueries(54):
            response = self.client.delete(
                reverse(API_GAMELOG, kwargs={"id": game.pk}),
                {"team_log_id": row.pk},
                format="json",
            )

        assert response.status_code == HTTPStatus.OK
        row.refresh_from_db()
        assert row.isDeleted


class TestManualScoreSurvivesGamelogWrites(WebTest):
    """Regression for #1988: a score entered in the designer results editor
    (no gamelog entries) was wiped by the next scorecard gamelog write."""

    def _enter_manual_score(self, game, halftime, final):
        response = self.app.patch_json(
            reverse("api-gamedays-game-result", kwargs={"pk": game.pk}),
            {"halftime_score": halftime, "final_score": final},
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK

    @staticmethod
    def _reopen(game):
        """Keep the game running after the editor closed it.

        The designer's result editor sets the game to ``beendet``; the log
        endpoints reject writes to a closed game (409 "Dieses Spiel ist
        beendet."), because the result is the final word and the scorecard
        navigates away after sending it. This regression is about the score
        arithmetic, so it keeps its subject on a game that is still running.
        """
        game.status = "1. Halbzeit"
        game.save()

    def _post_touchdown(self, game, team):
        response = self.app.post_json(
            reverse(API_GAMELOG, kwargs={"id": game.pk}),
            {
                "team": team,
                "gameId": game.pk,
                "half": 1,
                "event": [
                    {"name": "Touchdown", "player": "19"},
                    {"name": "1-Extra-Punkt", "player": "7"},
                ],
            },
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.CREATED

    def _delete_sequence(self, game, sequence):
        response = self.app.delete_json(
            reverse(API_GAMELOG, kwargs={"id": game.pk}),
            {"sequence": sequence},
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK

    def _scores(self, game):
        home = Gameresult.objects.get(gameinfo=game, isHome=True)
        away = Gameresult.objects.get(gameinfo=game, isHome=False)
        return (home.fh, home.sh, home.pa), (away.fh, away.sh, away.pa)

    def test_manual_score_survives_gamelog_add_and_delete(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.first()
        self._enter_manual_score(
            game, {"home": 14, "away": 7}, {"home": 28, "away": 14}
        )
        self._reopen(game)

        self._post_touchdown(game, "A1")
        assert self._scores(game) == ((21, 14, 14), (7, 7, 35))

        self._delete_sequence(game, 1)
        assert self._scores(game) == ((14, 14, 14), (7, 7, 28))

    def test_manual_score_survives_deleting_earlier_gamelog_entry(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.first()
        self._post_touchdown(game, "A1")
        self._enter_manual_score(
            game, {"home": 21, "away": 7}, {"home": 35, "away": 14}
        )
        self._reopen(game)

        self._delete_sequence(game, 1)
        assert self._scores(game) == ((14, 14, 14), (7, 7, 28))

    def test_repeated_delete_does_not_change_score_again(self):
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.first()
        self._enter_manual_score(
            game, {"home": 14, "away": 7}, {"home": 28, "away": 14}
        )
        self._reopen(game)
        self._post_touchdown(game, "A1")

        self._delete_sequence(game, 1)
        self._delete_sequence(game, 1)
        assert self._scores(game) == ((14, 14, 14), (7, 7, 28))


class TestGameHalftime(WebTest):
    def test_halftime_submitted(self):
        DBSetup().g62_status_empty()
        first_game: Gameinfo = Gameinfo.objects.first()
        self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": first_game.pk}),
            {"ctResult": "won", "direction": "arrow_forward", "fhPossession": "HOME"},
            headers=DBSetup().get_token_header(),
        )
        response = self.app.put_json(
            reverse(API_GAME_HALFTIME, kwargs={"pk": first_game.pk}),
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        first_game = Gameinfo.objects.first()
        assert first_game.status == "2. Halbzeit"
        assert re.match(r"^(0\d|1\d|2[0-3]):[0-5]\d", str(first_game.gameHalftime))

    def test_halftime_unknown_game_404(self):
        DBSetup().create_new_user()
        response = self.app.put_json(
            reverse(API_GAME_HALFTIME, kwargs={"pk": 999999}),
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_halftime_requires_started_game(self):
        DBSetup().g62_status_empty()
        first_game: Gameinfo = Gameinfo.objects.first()
        assert first_game.status == "Geplant"
        response = self.app.put_json(
            reverse(API_GAME_HALFTIME, kwargs={"pk": first_game.pk}),
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.CONFLICT
        assert response.json == {"detail": "Dieser Spielstatus erlaubt keine Halbzeit."}
        assert Gameinfo.objects.first().status == "Geplant"

    def test_halftime_after_finalize_conflict(self):
        DBSetup().g62_status_empty()
        first_game: Gameinfo = Gameinfo.objects.first()
        first_game.status = "beendet"
        first_game.save()
        response = self.app.put_json(
            reverse(API_GAME_HALFTIME, kwargs={"pk": first_game.pk}),
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.CONFLICT
        assert response.json == {"detail": "Dieser Spielstatus erlaubt keine Halbzeit."}
        assert Gameinfo.objects.first().status == "beendet"


class TestGameFinalize(WebTest):
    def test_game_is_finalized(self):
        DBSetup().g62_status_empty()
        first_game: Gameinfo = Gameinfo.objects.last()
        self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": first_game.pk}),
            {"ctResult": "won", "direction": "arrow_forward", "fhPossession": "AWAY"},
            headers=DBSetup().get_token_header(),
        )
        self.app.put_json(
            reverse(API_GAME_HALFTIME, kwargs={"pk": first_game.pk}),
            headers=DBSetup().get_token_header(),
        )
        response = self.app.put_json(
            reverse(API_GAME_FINALIZE, kwargs={"pk": first_game.pk}),
            {
                "homeCaptain": "Home Captain",
                "awayCaptain": "Away Captain",
                "note": "some final note",
                "hasFinalScoreChanged": True,
            },
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        gamesetup = GameSetup.objects.get(gameinfo=first_game)
        assert gamesetup.homeCaptain == "Home Captain"
        assert gamesetup.awayCaptain == "Away Captain"
        assert gamesetup.hasFinalScoreChanged is True
        assert gamesetup.note == "some final note"
        first_game: Gameinfo = Gameinfo.objects.last()
        assert first_game.status == "beendet"
        assert re.match(r"^(0\d|1\d|2[0-3]):[0-5]\d", str(first_game.gameFinished))

    def test_finalize_unknown_game_404(self):
        DBSetup().create_new_user()
        response = self.app.put_json(
            reverse(API_GAME_FINALIZE, kwargs={"pk": 999999}),
            {"note": "x"},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_finalize_requires_started_game(self):
        DBSetup().g62_status_empty()
        first_game: Gameinfo = Gameinfo.objects.first()
        assert first_game.status == "Geplant"
        response = self.app.put_json(
            reverse(API_GAME_FINALIZE, kwargs={"pk": first_game.pk}),
            {"note": "x"},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.CONFLICT
        assert response.json == {"detail": "Dieser Spielstatus erlaubt kein Spielende."}
        assert Gameinfo.objects.first().status == "Geplant"

    def test_finalize_allowed_from_first_half(self):
        DBSetup().g62_status_empty()
        first_game: Gameinfo = Gameinfo.objects.first()
        self.app.put_json(
            reverse(API_GAME_SETUP, kwargs={"pk": first_game.pk}),
            {"ctResult": "won", "direction": "arrow_forward", "fhPossession": "HOME"},
            headers=DBSetup().get_token_header(),
        )
        assert Gameinfo.objects.first().status == "1. Halbzeit"
        response = self.app.put_json(
            reverse(API_GAME_FINALIZE, kwargs={"pk": first_game.pk}),
            {"note": "x"},
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        assert Gameinfo.objects.first().status == "beendet"


class TestGamesToWhistlePasscheck(WebTest):
    """The whistle rows carry the passcheck state the v2 game list renders.

    ``PasscheckVerification`` is one row per team per gameday; a game counts as
    verified only when *both* of its teams are. The trap: ``id_home``/``id_away``
    in the whistle payload are ``Gameresult`` pks, not ``Team`` pks.
    """

    def setUp(self):
        self.gameday = DBSetup().g62_status_empty()
        # Pick a game whose home team was created *after* the away team: a
        # team-pk sort would put away first, so the test really pins the
        # requested home-first, jersey-ordered output.
        self.game = next(
            game
            for game in Gameinfo.objects.filter(gameday=self.gameday)
            if game.gameresult_set.get(isHome=True).team_id
            > game.gameresult_set.get(isHome=False).team_id
        )
        self.home_result = Gameresult.objects.get(gameinfo=self.game, isHome=True)
        self.away_result = Gameresult.objects.get(gameinfo=self.game, isHome=False)
        self.home = self.home_result.team
        self.away = self.away_result.team
        # The test only discriminates while a Gameresult pk differs from its
        # Team pk — equal values would let a team-pk comparison pass by luck.
        assert str(self.home_result.pk) != str(self.home_result.team_id)
        assert str(self.away_result.pk) != str(self.away_result.team_id)

    def _whistle_rows(self):
        response = self.app.get(
            reverse(
                API_GAMEDAY_WHISTLEGAMES,
                kwargs={"pk": self.gameday.pk, "team": "*"},
            ),
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        return response.json

    def test_games_to_whistle_reports_passcheck_state(self):
        rows = self._whistle_rows()

        assert rows
        assert all(row["passcheck"] is False for row in rows)
        assert [row["id"] for row in rows].count(self.game.pk) == 1

    def test_games_to_whistle_passcheck_is_true_for_two_verified_teams(self):
        for team in (self.home, self.away):
            PasscheckVerification.objects.create(
                gameday=self.gameday,
                team=team,
                official_name="Kontrolle",
                user=self.gameday.author,
            )

        rows = {row["id"]: row for row in self._whistle_rows()}

        assert rows[self.game.pk]["passcheck"] is True
        assert [game_id for game_id, row in rows.items() if row["passcheck"]] == [
            self.game.pk
        ]

    def test_games_to_whistle_passcheck_ignores_other_gamedays(self):
        # Same two teams verified for *another* gameday: this gameday's game
        # must stay unverified, so the flag has to be scoped by gameday.
        other_gameday = DBSetup().create_empty_gameday()
        for team in (self.home, self.away):
            PasscheckVerification.objects.create(
                gameday=other_gameday,
                team=team,
                official_name="Kontrolle",
                user=self.gameday.author,
            )

        rows = {row["id"]: row for row in self._whistle_rows()}

        assert rows[self.game.pk]["passcheck"] is False

    def test_games_to_whistle_reports_false_for_a_bracket_placeholder(self):
        placeholder = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="09:00",
            field=1,
            stage="Finalrunde",
            standing="P5",
            officials=Team.objects.first(),
        )
        Gameresult.objects.create(gameinfo=placeholder, team=None, isHome=True)
        Gameresult.objects.create(gameinfo=placeholder, team=None, isHome=False)

        rows = {row["id"]: row for row in self._whistle_rows()}

        assert rows[placeholder.pk]["passcheck"] is False

    def test_passcheck_annotation_costs_two_queries(self):
        games = [
            {
                "id": self.game.pk,
                "id_home": str(self.home_result.pk),
                "id_away": str(self.away_result.pk),
            }
        ]

        with CaptureQueriesContext(connection) as queries:
            GamesToWhistleAPIView._annotate_passcheck(games, self.gameday.pk)

        assert len(queries.captured_queries) == 2
        assert games[0]["passcheck"] is False


class TestGameRosterAPIView(APITestCase):
    def setUp(self):
        self.gameday = DBSetup().g62_status_empty()
        # Home team created *after* the away team, so only an explicit
        # home-first sort produces the expected order (see the roster test).
        self.game = next(
            game
            for game in Gameinfo.objects.filter(gameday=self.gameday)
            if game.gameresult_set.get(isHome=True).team_id
            > game.gameresult_set.get(isHome=False).team_id
        )
        self.home = Gameresult.objects.get(gameinfo=self.game, isHome=True).team
        self.away = Gameresult.objects.get(gameinfo=self.game, isHome=False).team
        self.client.force_authenticate(user=self.gameday.author)

    def _add_player(
        self,
        team,
        jersey,
        last_name,
        *,
        first_name="Test",
        gameday=None,
        left_on=None,
        joined_on=None,
    ):
        playerlist = PlayerlistFactory(
            team=team,
            player=PlayerFactory(
                person=PersonFactory(first_name=first_name, last_name=last_name),
                pass_number="12345",
            ),
            jersey_number=jersey,
            left_on=left_on,
            joined_on=joined_on or self.gameday.date,
        )
        PlayerlistGamedayFactory(
            playerlist=playerlist,
            gameday=gameday or self.gameday,
            gameday_jersey=jersey,
        )

    def _roster(self, game):
        return self.client.get(reverse("api-game-roster", kwargs={"pk": game.pk}))

    def _verify(self, *teams):
        """Record the passcheck of a team for this gameday.

        Only a verified team's jersey numbers are tied to names; without this
        row the roster answers the numbers alone.
        """
        for team in teams:
            PasscheckVerification.objects.create(
                gameday=self.gameday,
                team=team,
                official_name="Test Official",
                user=self.gameday.author,
            )

    def _placeholder_game(self):
        placeholder = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="09:00",
            field=1,
            stage="Finalrunde",
            standing="P5",
            officials=Team.objects.first(),
        )
        Gameresult.objects.create(gameinfo=placeholder, team=None, isHome=True)
        Gameresult.objects.create(gameinfo=placeholder, team=None, isHome=False)
        return placeholder

    def test_game_roster_lists_only_active_players_of_this_game(self):
        self._add_player(self.home, 7, "Muster")
        self._add_player(self.home, 9, "", first_name="NurVorname")
        self._add_player(self.away, 11, "Testmann")
        self._verify(self.home, self.away)

        # Left before the gameday: snapshotted, but no longer eligible.
        self._add_player(
            self.home,
            12,
            "Ehemalig",
            left_on=self.gameday.date - timedelta(days=1),
        )
        # Active, but on a team that does not play this game.
        other_team_id = (
            Gameresult.objects.filter(
                gameinfo__gameday=self.gameday, team__isnull=False
            )
            .exclude(team_id__in=[self.home.pk, self.away.pk])
            .values_list("team_id", flat=True)
            .first()
        )
        self._add_player(Team.objects.get(pk=other_team_id), 13, "Fremdteam")
        # A home player snapshotted for a different gameday only.
        self._add_player(
            self.home,
            14,
            "AndererTag",
            gameday=DBSetup().create_empty_gameday(),
        )
        # Joined after the gameday: not yet eligible.
        self._add_player(
            self.home,
            15,
            "Zukunft",
            joined_on=self.gameday.date + timedelta(days=1),
        )

        response = self._roster(self.game)

        assert response.status_code == HTTPStatus.OK
        assert response.data == [
            {"side": "home", "jersey": 7, "name": "Muster"},
            {"side": "home", "jersey": 9, "name": "NurVorname"},
            {"side": "away", "jersey": 11, "name": "Testmann"},
        ]
        # Home first, then by jersey — no sorting in the test that could hide
        # a regression in the server-side order.
        assert [row["side"] for row in response.data] == ["home", "home", "away"]
        # Jersey and surname only — the pass number never leaves the server.
        assert all(set(row) == {"side", "jersey", "name"} for row in response.data)
        assert "12345" not in response.text

    def test_game_roster_name_falls_back_to_first_name_then_null(self):
        self._add_player(self.home, 7, "", first_name="")
        self._add_player(self.home, 9, "", first_name="NurVorname")
        self._verify(self.home)

        response = self._roster(self.game)

        assert response.data == [
            {"side": "home", "jersey": 7, "name": None},
            {"side": "home", "jersey": 9, "name": "NurVorname"},
        ]

    def test_game_roster_names_nobody_without_a_passcheck(self):
        """The field bug: every number carried the same surname.

        A gameday whose teams were checked in (or seeded) without a passcheck
        has jersey numbers but no verified name per number. The pad must then
        show the numbers alone — a name that may belong to any other jersey is
        worse than no name at all.
        """
        for jersey in (1, 2, 3):
            self._add_player(self.home, jersey, "Conrad")
            self._add_player(self.away, jersey, "Albrecht")

        response = self._roster(self.game)

        assert response.status_code == HTTPStatus.OK
        # The numbers stay: the officials still enter one of them.
        assert [row["jersey"] for row in response.data] == [1, 2, 3, 1, 2, 3]
        assert all(row["name"] is None for row in response.data)

    def test_game_roster_names_only_the_verified_side(self):
        self._add_player(self.home, 7, "Muster")
        self._add_player(self.away, 11, "Testmann")
        self._verify(self.home)

        response = self._roster(self.game)

        assert response.data == [
            {"side": "home", "jersey": 7, "name": "Muster"},
            {"side": "away", "jersey": 11, "name": None},
        ]

    def test_game_roster_names_are_not_shared_between_jerseys(self):
        # Two players, two numbers, two names: the picker gets the name of the
        # number it asks for, never the first one of the team.
        self._add_player(self.home, 7, "Meier")
        self._add_player(self.home, 9, "Schulz")
        self._verify(self.home)

        response = self._roster(self.game)

        assert {row["jersey"]: row["name"] for row in response.data} == {
            7: "Meier",
            9: "Schulz",
        }

    def test_game_roster_query_count_is_flat(self):
        url = reverse("api-game-roster", kwargs={"pk": self.game.pk})

        pin_request_path_caches()
        with self.assertNumQueries(4):
            response = self.client.get(url)
        assert response.status_code == HTTPStatus.OK

        for jersey in range(1, 41):
            self._add_player(self.home, jersey, f"Spieler{jersey}")

        pin_request_path_caches()
        with self.assertNumQueries(4):
            response = self.client.get(url)
        assert len(response.data) == 40

    def test_game_roster_is_empty_for_a_bracket_placeholder(self):
        # A roster exists for a real team of the gameday; the placeholder game
        # still has to answer empty instead of dumping every player of the day.
        self._add_player(self.home, 7, "Muster")

        response = self._roster(self._placeholder_game())

        assert response.status_code == HTTPStatus.OK
        assert response.data == []

    def test_game_roster_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self._roster(self.game)

        assert response.status_code == HTTPStatus.UNAUTHORIZED


class TestConfigPenaltiesAPIView(WebTest):
    def test_penalty_list_is_the_rule_definition(self):
        """The shipped catalogue plus the two rows IFAF 2023 p. 39 requires."""
        response = self.app.get(reverse(API_CONFIG_SCORECARD_PENALTIES))

        assert response.status_code == HTTPStatus.OK
        rows = response.json
        assert len(rows) == 54
        assert set(rows[0]) == {"name", "subtext", "isPenaltyAgainstOpponent"}
        names = [row["name"] for row in rows]
        assert "Fehlgeschlagene Challenge Offense" in names
        assert "Auszeit ohne verbleibende Auszeit Defense" in names
        # the old app relies on the flag, so the side must survive the move
        defence = next(r for r in rows if r["name"] == "illegaler Kontakt Defense")
        assert defence["isPenaltyAgainstOpponent"] is True

    def test_the_fifty_shipped_rows_keep_their_order(self):
        rows = self.app.get(reverse(API_CONFIG_SCORECARD_PENALTIES)).json
        assert rows[0]["name"] == "illegaler Kontakt Defense"
        assert rows[49]["name"] == (
            "Person mit blutender Wunde verlässt nicht das Feld Defense"
        )


class TestConfigRulesAPIView(WebTest):
    def test_get_rules_definition(self):
        response = self.app.get(reverse(API_CONFIG_SCORECARD_RULES))

        assert response.status_code == HTTPStatus.OK
        rules = response.json
        assert rules["ruleset"] == "IFAF 2023"
        assert rules["field"]["length"] == 50
        assert rules["series"]["downs"] == 4
        assert rules["scoring"]["touchdown"] == 6
        assert len(rules["penalties"]) == 54
        # the app needs the structured fields, not the subtext
        row = rules["penalties"][0]
        assert {"yards", "down", "enforcement", "side"} <= set(row)


class TestGamePossessionAPIView(WebTest):
    def test_put_game_possession(self):
        DBSetup().g62_status_empty()
        last_game: Gameinfo = Gameinfo.objects.last()
        assert last_game.in_possession == "A1"
        response = self.app.put_json(
            reverse(API_GAME_POSSESSION, kwargs={"pk": last_game.pk}),
            {"team": "B1"},
            headers=DBSetup().get_token_header(),
        )
        assert response.status_code == HTTPStatus.OK
        assert Gameinfo.objects.last().in_possession == "B1"

    def test_possession_unknown_game_404(self):
        DBSetup().create_new_user()
        response = self.app.put_json(
            reverse(API_GAME_POSSESSION, kwargs={"pk": 999999}),
            {"team": "A1"},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_put_game_possession_rejects_unknown_team(self):
        DBSetup().g62_status_empty()
        last_game: Gameinfo = Gameinfo.objects.last()
        response = self.app.put_json(
            reverse(API_GAME_POSSESSION, kwargs={"pk": last_game.pk}),
            {"team": "Not A Real Team XYZ"},
            headers=DBSetup().get_token_header(),
            expect_errors=True,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert Gameinfo.objects.last().in_possession == "A1"
