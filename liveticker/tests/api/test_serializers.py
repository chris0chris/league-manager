from datetime import datetime

from liveticker.api.serializers import TeamlogSerializer, LivetickerSerializer


class TestTeamlogSerializer:
    @staticmethod
    def create_some_teamlog(**kwargs):
        allowed_keys = ["event", "player", "input", "created_time", "team__name"]
        defaults = {
            "event": "Touchdown",
            "player": None,
            "input": None,
            "created_time": datetime.now(),
            "team__name": "name of team",
        }
        updated_values = {key: kwargs[key] for key in allowed_keys if key in kwargs}
        defaults.update(updated_values)
        return defaults

    def test_default_works(self):
        now = datetime.now()
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(player=7, created_time=now),
            TestTeamlogSerializer.create_some_teamlog(),
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries, home_team="name of team", many=True
        )
        assert dict(serializer.data[0]) == {
            "team": "home",
            "text": "Touchdown: #7",
            "time": now.strftime("%H:%M"),
        }

    def test_team_is_none(self):
        now = datetime.now()
        teamlog_entries = [
            TestTeamlogSerializer.create_some_teamlog(event="Spielzeit", input="1:05")
        ]
        serializer = TeamlogSerializer(
            instance=teamlog_entries, home_team="name of team", many=True
        )
        assert dict(serializer.data[0]) == {
            "team": None,
            "text": "Spielzeit - 1:05",
            "time": now.strftime("%H:%M"),
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
        now = datetime(2022, 1, 7, 7, 7, 7)
        liveticker_entries = [
            TestLivetickerSerializer.create_some_liveticker(gameStarted=now)
        ]
        serializer = LivetickerSerializer(instance=liveticker_entries, many=True)
        assert serializer.data[0]["time"] == "07:07"
