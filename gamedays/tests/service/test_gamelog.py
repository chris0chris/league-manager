import json
from datetime import UTC, datetime, time
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase

from gamedays.models import Team, Gameinfo, Gameresult, TeamLog
from gamedays.service.gamelog import GameLog, GameLogObject, GameLogCreator
from gamedays.service.utils import AsJsonEncoder
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamelog(TestCase):
    def test_get_home_and_away_team(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        home = Gameresult.objects.get(gameinfo=firstGameEntry, isHome=True).team.name
        away = Gameresult.objects.get(gameinfo=firstGameEntry, isHome=False).team.name
        assert gamelog.get_home_team() == home
        assert gamelog.get_away_team() == away

    def test_entries_per_half(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        assert len(gamelog.get_entries_home_firsthalf()) == 5
        assert len(gamelog.get_entries_home_secondhalf()) == 5
        assert len(gamelog.get_entries_away_firsthalf()) == 0
        assert len(gamelog.get_entries_away_secondhalf()) == 5

    def test_firsthalf_is_played(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        assert gamelog.is_firsthalf()

    def test_secondhalf_is_played(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        firstGameEntry.gameHalftime = "09:57"
        firstGameEntry.save()
        gamelog = GameLog(firstGameEntry)
        assert not gamelog.is_firsthalf()

    def test_json_representation_of_gamelog_object(self):
        g = GameLogObject(81, "White", "Red", 11, 22)
        g.home.score = 18
        g.away.score = 7
        assert json.dumps(g.as_json(), cls=AsJsonEncoder) == json.dumps(
            {
                "gameId": 81,
                "isFirstHalf": True,
                "inPossession": None,
                "events": [],
                "home": {
                    "id": 11,
                    "name": "White",
                    "score": 18,
                    "firsthalf": {"score": None, "entries": []},
                    "secondhalf": {"score": None, "entries": []},
                },
                "away": {
                    "id": 22,
                    "name": "Red",
                    "score": 7,
                    "firsthalf": {"score": None, "entries": []},
                    "secondhalf": {"score": None, "entries": []},
                },
            }
        )

    def test_as_json_carries_possession_and_raw_events(self):
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

        payload = json.loads(GameLog(gameinfo).as_json())

        assert payload["inPossession"] == "Home"
        assert (
            len(payload["events"]) == TeamLog.objects.filter(gameinfo=gameinfo).count()
        )
        penalty = next(
            event for event in payload["events"] if event["event"] == "Strafe"
        )
        assert penalty["team"] == "Home"
        assert penalty["input"] == "Holding Defense"
        assert penalty["time"].startswith(
            f"{gameinfo.gameday.date.isoformat()}T12:34:00"
        )

    def test_events_are_newest_first_by_insertion(self):
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
            event="Auszeit",
            input="1:30",
            half=1,
            author=author,
            created_time=time(11, 0),
        )

        payload = json.loads(GameLog(gameinfo).as_json())

        assert [event["event"] for event in payload["events"]] == [
            "Auszeit",
            "Touchdown",
        ]

    def test_as_json_before_a_game_has_a_possession(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        gameinfo.in_possession = ""
        gameinfo.save()

        payload = json.loads(GameLog(gameinfo).as_json())

        assert payload["inPossession"] is None
        assert payload["events"] == []

    def test_create_entries(self):
        first_game_entry = DBSetup().create_teamlog_home_and_away()
        first_team = Team.objects.first()
        gamelog = GameLog(first_game_entry)
        actual_gamelog = TeamLog.objects.filter(
            gameinfo=first_game_entry, team=first_team, half=1
        )
        actual_gamelog_entries_as_json = gamelog.create_entries_for_half(actual_gamelog)
        assert actual_gamelog_entries_as_json == [
            {
                "sequence": 1,
                "td": 19,
            },
            {
                "sequence": 2,
                "td": 19,
                "pat2": 7,
            },
            {
                "sequence": 3,
                "td": 19,
                "pat1": 7,
            },
        ]

    def test_get_half_score(self):
        firstGameEntry = DBSetup().create_teamlog_home_and_away()
        gamelog = GameLog(firstGameEntry)
        assert gamelog.get_home_firsthalf_score() == 21
        assert gamelog.get_home_secondhalf_score() == 21
        assert gamelog.get_away_firsthalf_score() == 0
        assert gamelog.get_away_secondhalf_score() == 3

    def test_mark_log_deleted(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        first_team = Team.objects.first()
        sequence = 2
        gamelog = GameLog(gameinfo)
        gamelog.mark_entries_as_deleted(sequence)
        gamelog_list = TeamLog.objects.filter(sequence=sequence)
        assert gamelog_list[0].isDeleted, "touchdown should be marked as deleted"
        assert gamelog_list[1].isDeleted, "PAT should be marked as deleted"
        actual_gamelog = TeamLog.objects.filter(
            gameinfo=gameinfo, team=first_team, half=1
        )
        actual_gamelog_entries_as_json = gamelog.create_entries_for_half(actual_gamelog)
        assert actual_gamelog_entries_as_json == [
            {
                "sequence": 1,
                "td": 19,
            },
            {"sequence": 2, "td": 19, "pat2": 7, "isDeleted": True},
            {
                "sequence": 3,
                "td": 19,
                "pat1": 7,
            },
        ]
        assert gamelog.get_home_firsthalf_score() == 13
        assert gamelog.get_home_score() == 34


class TestGamelogCreator(TestCase):
    def test_gamelog_with_timeout(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        team = Team.objects.first()
        user = User.objects.first()
        gamelog_creator = GameLogCreator(
            firstGame, team, [{"name": "Auszeit", "input": "00:01"}], user
        )
        gamelog_creator.create()
        assert len(TeamLog.objects.all()) == 1
        teamlog = TeamLog.objects.first()
        assert teamlog.sequence == 0
        assert teamlog.input == "00:01"
        assert teamlog.value == 0
        assert teamlog.half == 1

    def test_created_time_default_is_utc(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        team = Team.objects.first()
        # 2026-08-15 09:05 UTC == 11:05 Europe/Berlin (CEST, UTC+2)
        # The TimeField default (timezone.now, an aware UTC datetime) must
        # persist the raw UTC time-of-day, not the local wall-clock time;
        # rendering to local time is the frontend's job.
        user = User.objects.first()
        utc_now = datetime(2026, 8, 15, 9, 5, 0, tzinfo=UTC)
        created_time_field = TeamLog._meta.get_field("created_time")
        with mock.patch.object(created_time_field, "get_default", return_value=utc_now):
            with self.assertNumQueries(1):
                TeamLog.objects.create(
                    gameinfo=firstGame,
                    team=team,
                    sequence=1,
                    event="Auszeit",
                    input="00:01",
                    half=1,
                    author=user,
                )
        teamlog = TeamLog.objects.first()
        assert teamlog.created_time == utc_now.time()

    def test_gamelog_with_penalty(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        team = Team.objects.first()
        user = User.objects.first()
        gamelog_creator = GameLogCreator(
            firstGame, team, [{"name": "Strafe", "input": "illegaler Kontakt"}], user
        )
        gamelog_creator.create()
        assert len(TeamLog.objects.all()) == 1
        teamlog = TeamLog.objects.first()
        assert teamlog.sequence == 0
        assert teamlog.input == "illegaler Kontakt"
        assert teamlog.value == 0
        assert teamlog.half == 1

    def test_gamelog_is_created(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        team = Team.objects.first()
        user = User.objects.first()
        gamelog_creator = GameLogCreator(
            firstGame,
            team,
            [
                {"name": "Touchdown", "player": "7"},
                {"name": "1-Extra-Punkt", "player": ""},
                {"name": "2-Extra-Punkte", "player": "19"},
                {"name": "Safety (+1)", "player": "22"},
                {"name": "Safety (+2)", "player": "12"},
            ],
            user,
        )
        gamelog_creator.create()
        gamelog_creator = GameLogCreator(
            firstGame, team, [{"name": "Turnover"}], user, 2
        )
        gamelog_creator.create()
        first_team_log = TeamLog.objects.first()
        assert len(TeamLog.objects.all()) == 6
        teamlog = TeamLog.objects.get(pk=first_team_log.pk + 5)
        assert teamlog.sequence == 2
        assert teamlog.value == 0
        assert teamlog.half == 2
        teamlog = TeamLog.objects.get(pk=first_team_log.pk + 1)
        assert teamlog.sequence == 1
        # a conversion without a number still scores: the points are the team's
        assert teamlog.value == 1
        assert teamlog.half == 1
        teamlog = TeamLog.objects.get(pk=first_team_log.pk)
        assert teamlog.sequence == 1
        assert teamlog.value == 6
        assert teamlog.half == 1

    def test_a_missed_try_is_stored_with_value_zero(self):
        # "nicht verwandelt" keeps the try's name (the row still says which try
        # was attempted) but must not score: the client marks the miss in the
        # payload, and the value follows that, not the name.
        DBSetup().g62_status_empty()
        game = Gameinfo.objects.first()
        team = Team.objects.first()
        user = User.objects.first()
        GameLogCreator(
            game,
            team,
            [
                {
                    "name": "1-Extra-Punkt",
                    "player": "23",
                    "input": "nicht verwandelt · QB #7",
                    "payload": {"missed": True, "qb": 7},
                },
                {"name": "2-Extra-Punkte", "player": "19"},
            ],
            user,
        ).create()

        missed = TeamLog.objects.get(event="1-Extra-Punkt")
        assert missed.value == 0
        assert missed.input == "nicht verwandelt · QB #7"
        assert missed.player == 23
        # The rows share one submission: the converted try still scores.
        assert TeamLog.objects.get(event="2-Extra-Punkte").value == 2
        assert (
            sum(TeamLog.objects.filter(gameinfo=game).values_list("value", flat=True))
            == 2
        )


class TestScoringEvents:
    def test_scoring_events_match_the_point_values(self):
        from gamedays.service.gamelog import (
            SCORING_EVENTS,
            SCORING_EVENT_VALUES,
            GameLogCreator,
        )

        assert set(SCORING_EVENTS) == set(SCORING_EVENT_VALUES)
        assert "Auszeit" not in SCORING_EVENTS
        for event in SCORING_EVENTS:
            assert SCORING_EVENT_VALUES[event] > 0
            assert GameLogCreator._getValue(None, event) == SCORING_EVENT_VALUES[event]
        assert GameLogCreator._getValue(None, "Strafe") == 0
