from datetime import UTC, datetime

from liveticker.api.serializers import (
    TeamlogSerializer,
    LivetickerSerializer,
)


class TestTeamlogSerializer:
    @staticmethod
    def create_some_teamlog(**kwargs):
        allowed_keys = [
            "event",
            "player",
            "input",
            "value",
            "created_time",
            "team__name",
        ]
        defaults = {
            "event": "Touchdown",
            "player": None,
            "input": None,
            "value": 1,
            "created_time": datetime.now(),
            "team__name": "name of team",
        }
        updated_values = {key: kwargs[key] for key in allowed_keys if key in kwargs}
        defaults.update(updated_values)
        return defaults

    def test_default_works(self):
        ref_now = datetime(2026, 8, 15, 12, 0, 0, tzinfo=UTC)
        created_time = datetime(2026, 8, 15, 8, 5, 0, tzinfo=UTC)
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(
                player=7, created_time=created_time
            ),
            TestTeamlogSerializer.create_some_teamlog(created_time=created_time),
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries,
            home_team="name of team",
            ref_now=ref_now,
            many=True,
        )
        assert dict(serializer.data[0]) == {
            "team": "home",
            "text": "Touchdown: #7",
            "time": "2026-08-15T08:05:00+00:00",
        }

    def test_team_is_none(self):
        ref_now = datetime(2026, 8, 15, 12, 0, 0, tzinfo=UTC)
        created_time = datetime(2026, 8, 15, 8, 5, 0, tzinfo=UTC)
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(
                event="Spielzeit", input="1:05", created_time=created_time
            )
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries,
            home_team="name of team",
            ref_now=ref_now,
            many=True,
        )
        assert dict(serializer.data[0]) == {
            "team": None,
            "text": "Spielzeit - 1:05",
            "time": "2026-08-15T08:05:00+00:00",
        }

    def test_get_text_for_pat(self):
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(player=7, event="1-Extra-Punkt")
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries, home_team=None, many=True
        )
        assert serializer.data[0]["text"] == "1-Extra-Punkt: #7"

    def test_get_text_for_timeout(self):
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(event="Auszeit", input="00:01")
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries, home_team=None, many=True
        )
        assert serializer.data[0]["text"] == "Auszeit - 00:01"

    def test_get_text_for_incomplete_pat(self):
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(event="1-Extra-Punkt")
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries, home_team=None, many=True
        )
        assert serializer.data[0]["text"] == "1-Extra-Punkt: -"

    def test_get_text_for_safety(self):
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(player=7, event="Safety")
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries, home_team=None, many=True
        )
        assert serializer.data[0]["text"] == "Safety: #7"

    def test_get_text_for_turnover(self):
        teamlog_entries = [TestTeamlogSerializer.create_some_teamlog(event="Turnover")]
        serializer = TeamlogSerializer(
            instance=teamlog_entries, home_team=None, many=True
        )
        assert serializer.data[0]["text"] == "Ballabgabe"

    def test_is_home_or_way_in_possession(self):
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(),
            TestTeamlogSerializer.create_some_teamlog(team__name="not home team name"),
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries, home_team="name of team", many=True
        )
        assert serializer.data[0]["team"] == "home"
        assert serializer.data[1]["team"] == "away"


class TestTeamlogSerializerMissedTry:
    """A conversion that failed is a story of its own: it says so and why."""

    def test_the_row_value_is_part_of_the_query_fields(self):
        # ``get_text`` decides "missed" from ``value``, so the service's
        # ``.values()`` has to fetch it.
        assert "value" in TeamlogSerializer.ALL_VALUE_FIELDS

    @staticmethod
    def text_for(event, player, input_value, value):
        entry = TestTeamlogSerializer.create_some_teamlog(
            event=event, player=player, input=input_value, value=value
        )
        serializer = TeamlogSerializer(instance=[entry], home_team=None, many=True)
        return serializer.data[0]["text"]

    def test_a_missed_extra_point_names_the_receiver_and_the_deflection(self):
        assert (
            self.text_for("1-Extra-Punkt", 3, "nicht verwandelt · Deflection #2", 0)
            == "1-Extra-Punkt: #3 - nicht verwandelt · Deflection #2"
        )

    def test_a_missed_extra_point_without_a_receiver_skips_the_player_slot(self):
        assert (
            self.text_for("1-Extra-Punkt", None, "nicht verwandelt · Tackle #2", 0)
            == "1-Extra-Punkt - nicht verwandelt · Tackle #2"
        )

    def test_a_missed_two_point_try_names_its_own_event(self):
        assert (
            self.text_for("2-Extra-Punkte", 7, "nicht verwandelt", 0)
            == "2-Extra-Punkte: #7 - nicht verwandelt"
        )

    def test_a_legacy_miss_without_input_still_says_nicht_verwandelt(self):
        assert (
            self.text_for("2-Extra-Punkte", None, None, 0)
            == "2-Extra-Punkte - nicht verwandelt"
        )

    def test_a_miss_without_the_prefix_still_says_nicht_verwandelt(self):
        assert (
            self.text_for("1-Extra-Punkt", 3, "Deflection #2", 0)
            == "1-Extra-Punkt: #3 - nicht verwandelt · Deflection #2"
        )

    def test_a_converted_try_is_unchanged(self):
        assert self.text_for("1-Extra-Punkt", 3, None, 1) == "1-Extra-Punkt: #3"
        assert self.text_for("2-Extra-Punkte", 7, None, 2) == "2-Extra-Punkte: #7"


class TestLivetickerSerializer:
    @staticmethod
    def create_some_liveticker(**kwargs):
        allowed_keys = [
            "scheduled",
            "id",
            "status",
            "standing",
            "gameStarted",
            "name_home",
            "name_away",
            "score_home",
            "score_away",
            "in_possession",
            "teamlog",
            "full_name_home",
            "full_name_away",
        ]
        defaults = {
            "scheduled": datetime(2021, 12, 7, 10, 00),
            "id": 7,
            "status": "Geplant",
            "standing": "Group 1",
            "gameStarted": None,
            "name_home": "home",
            "full_name_home": "home team",
            "name_away": "away",
            "full_name_away": "away team",
            "score_home": 7,
            "score_away": 25,
            "in_possession": "home",
            "teamlog": [TestTeamlogSerializer.create_some_teamlog(**kwargs)],
        }

        updated_values = {key: kwargs[key] for key in allowed_keys if key in kwargs}
        defaults.update(updated_values)
        return defaults

    def test_game_with_no_team_logs(self):
        liveticker_entries = [
            TestLivetickerSerializer.create_some_liveticker(teamlog=[])
        ]
        serializer = LivetickerSerializer(instance=liveticker_entries, many=True)
        assert dict(serializer.data[0]) == {
            "gameId": 7,
            "status": "Geplant",
            "standing": "Group 1",
            "time": "10:00",
            "home": {
                "name": "home team",
                "score": 7,
                "isInPossession": True,
            },
            "away": {
                "name": "away team",
                "score": 25,
                "isInPossession": False,
            },
            "ticks": [],
        }

    def test_game_with_game_started_time(self):
        ref_now = datetime(2022, 1, 7, 12, 0, 0, tzinfo=UTC)
        game_started = datetime(2022, 1, 7, 7, 7, 7, tzinfo=UTC)
        liveticker_entries = [
            TestLivetickerSerializer.create_some_liveticker(gameStarted=game_started)
        ]
        serializer = LivetickerSerializer(
            instance=liveticker_entries, many=True, ref_now=ref_now
        )
        assert serializer.data[0]["time"] == "2022-01-07T07:07:07+00:00"

    def test_game_started_near_utc_midnight_uses_previous_day(self):
        # A tick/game recorded at 23:50 UTC just before the DST-end instant
        # must be attributed to the previous day, not to "today" — otherwise
        # the frontend resolves the wrong DST offset (off by a full hour).
        ref_now = datetime(2026, 10, 25, 0, 5, 0, tzinfo=UTC)
        game_started = datetime(2026, 10, 24, 23, 50, 0, tzinfo=UTC)
        liveticker_entries = [
            TestLivetickerSerializer.create_some_liveticker(gameStarted=game_started)
        ]
        serializer = LivetickerSerializer(
            instance=liveticker_entries, many=True, ref_now=ref_now
        )
        assert serializer.data[0]["time"] == "2026-10-24T23:50:00+00:00"


class TestTeamlogSerializerPlayByPlay:
    """The play rows carry their detail into the ticker text."""

    @staticmethod
    def text_for(event, player, input_value):
        entry = TestTeamlogSerializer.create_some_teamlog(
            event=event, player=player, input=input_value
        )
        serializer = TeamlogSerializer(instance=[entry], home_team=None, many=True)
        return serializer.data[0]["text"]

    def test_a_pass_shows_the_receiver_and_the_play_detail(self):
        assert (
            self.text_for("Pass", 7, "8 Yards · QB #12")
            == "Pass: #7 - 8 Yards · QB #12"
        )

    def test_an_incomplete_pass_keeps_its_name(self):
        assert (
            self.text_for("Pass unvollständig", None, "QB #12")
            == "Pass unvollständig - QB #12"
        )

    def test_a_run_and_a_sack_show_their_yards(self):
        assert self.text_for("Run", 23, "14 Yards") == "Run: #23 - 14 Yards"
        assert self.text_for("Sack", 12, "5 Yards Verlust") == (
            "Sack: #12 - 5 Yards Verlust"
        )

    def test_a_touchdown_with_yards_keeps_the_scorer(self):
        assert self.text_for("Touchdown", 7, "8 Yards") == (
            "Touchdown: #7 - 8 Yards"
        )
