from django.contrib.auth.models import User
from rest_framework.fields import SerializerMethodField, IntegerField
from rest_framework.serializers import ModelSerializer, Serializer

from gamedays.models import (
    Gameday,
    Gameinfo,
    GameOfficial,
    GameSetup,
    LeagueManager,
    GamedayManager,
    TeamManager,
)


class GamedaySerializer(ModelSerializer):
    class Meta:
        model = Gameday
        fields = "__all__"
        read_only_fields = ["author"]
        extra_kwargs = {"start": {"format": "%H:%M"}}


class GamedayInfoSerializer(Serializer):
    id = IntegerField()
    name = SerializerMethodField()

    def get_name(self, obj: dict):
        return f'{obj["name"]} ({obj["league__name"]})'


class GameOfficialSerializer(ModelSerializer):
    class Meta:
        model = GameOfficial
        exclude = ("gameinfo",)


class GameinfoSerializer(ModelSerializer):
    class Meta:
        model = Gameinfo
        fields = ["status", "gameStarted", "gameHalftime", "gameFinished"]
        extra_kwargs = {
            "gameStarted": {"format": "%H:%M"},
            "gameHalftime": {"format": "%H:%M"},
            "gameFinished": {"format": "%H:%M"},
        }


class GameSetupSerializer(ModelSerializer):
    class Meta:
        model = GameSetup
        fields = ["ctResult", "direction", "fhPossession"]


class GameFinalizer(ModelSerializer):
    class Meta:
        model = GameSetup
        fields = ["homeCaptain", "awayCaptain", "hasFinalScoreChanged", "note"]


class GameLogSerializer(Serializer):
    ID = "id"
    GAME_HALFTIME = "gameHalftime"
    HOME_TEAM = "home"
    AWAY_TEAM = "away"
    SCORE_HOME_SH = "score_home_sh"
    SCORE_HOME_FH = "score_home_fh"
    SCORE_HOME_OVERALL = "score_home_overall"
    SCORE_AWAY_OVERALL = "score_away_overall"
    SCORE_AWAY_FH = "score_away_fh"
    SCORE_AWAY_SH = "score_away_sh"
    TEAMLOG_HOME = "teamlog_home"
    TEAMLOG_AWAY = "teamlog_away"

    ALL_FIELD_VALUES = [
        ID,
        GAME_HALFTIME,
        HOME_TEAM,
        AWAY_TEAM,
        SCORE_HOME_OVERALL,
        SCORE_HOME_FH,
        SCORE_HOME_SH,
        SCORE_AWAY_OVERALL,
        SCORE_AWAY_FH,
        SCORE_AWAY_SH,
    ]

    gameId = IntegerField(source=ID)
    isFirstHalf = SerializerMethodField("check_first_half")
    home = SerializerMethodField()
    away = SerializerMethodField()

    def check_first_half(self, obj: dict) -> bool:
        return obj[self.GAME_HALFTIME] is None

    def get_home(self, obj: dict) -> dict:
        return self._get_team(is_home=True, obj=obj)

    def get_away(self, obj: dict) -> dict:
        return self._get_team(is_home=False, obj=obj)

    def _get_team(self, obj: dict, is_home: bool) -> dict:
        score_key = self.SCORE_HOME_OVERALL if is_home else self.SCORE_AWAY_OVERALL
        fh_key = self.SCORE_HOME_FH if is_home else self.SCORE_AWAY_FH
        sh_key = self.SCORE_HOME_SH if is_home else self.SCORE_AWAY_SH
        entries_firsthalf, entries_secondhalf = self._get_entries(
            is_home=is_home, obj=obj
        )
        return {
            "name": obj[self.HOME_TEAM] if is_home else obj[self.AWAY_TEAM],
            "score": obj[score_key],
            "firsthalf": {"score": obj[fh_key], "entries": entries_firsthalf},
            "secondhalf": {"score": obj[sh_key], "entries": entries_secondhalf},
        }

    def _get_entries(self, is_home: bool, obj: dict):
        teamlog = self.TEAMLOG_HOME if is_home else self.TEAMLOG_AWAY
        teamlog = obj[teamlog]
        teamlog_firsthalf = []
        teamlog_secondhalf = []
        for entry in teamlog:
            if entry["half"] == 1:
                teamlog_firsthalf += [entry]
            else:
                teamlog_secondhalf += [entry]
        teamlog_firsthalf = self._create_entries_for_half(teamlog_firsthalf)
        teamlog_secondhalf = self._create_entries_for_half(teamlog_secondhalf)
        return teamlog_firsthalf, teamlog_secondhalf

    def _create_entries_for_half(self, half_entries: list):
        result = dict()
        entry: dict
        for entry in half_entries:
            if result.get(entry["sequence"]) is None:
                result[entry["sequence"]] = {"sequence": entry["sequence"]}
            if entry["cop"]:
                result[entry["sequence"]].update(
                    {
                        "cop": entry["cop"],
                        "name": entry["event"],
                    }
                )
            else:
                if entry["event"] == "Touchdown":
                    key = "td"
                elif entry["event"] == "1-Extra-Punkt":
                    key = "pat1"
                elif entry["event"] == "2-Extra-Punkte":
                    key = "pat2"
                elif entry["event"] == "Overtime":
                    key = "OT"
                else:
                    key = entry["event"]
                result[entry["sequence"]].update({key: entry["player"]})
            if entry["isDeleted"]:
                result[entry["sequence"]].update({"isDeleted": True})
        return list(result.values())


class LeagueManagerSerializer(ModelSerializer):
    """Serializer for LeagueManager model"""

    user_username = SerializerMethodField()
    user_id = IntegerField(write_only=True)
    league_name = SerializerMethodField()
    season_name = SerializerMethodField()
    created_by_username = SerializerMethodField()

    class Meta:
        model = LeagueManager
        fields = [
            "id",
            "user_id",
            "user_username",
            "league",
            "league_name",
            "season",
            "season_name",
            "created_at",
            "created_by",
            "created_by_username",
        ]
        read_only_fields = ["id", "created_at", "created_by"]

    def get_user_username(self, obj):
        return obj.user.username if obj.user else None

    def get_league_name(self, obj):
        return obj.league.name if obj.league else None

    def get_season_name(self, obj):
        return obj.season.name if obj.season else "All Seasons"

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

    def create(self, validated_data):
        from rest_framework.exceptions import ValidationError

        user_id = validated_data.pop("user_id")
        try:
            validated_data["user"] = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise ValidationError({"user_id": f"User with id {user_id} does not exist"})
        return super().create(validated_data)


class GamedayManagerSerializer(ModelSerializer):
    """Serializer for GamedayManager model"""

    user_username = SerializerMethodField()
    user_id = IntegerField(write_only=True)
    gameday_name = SerializerMethodField()
    gameday_date = SerializerMethodField()
    assigned_by_username = SerializerMethodField()

    class Meta:
        model = GamedayManager
        fields = [
            "id",
            "user_id",
            "user_username",
            "gameday",
            "gameday_name",
            "gameday_date",
            "can_edit_details",
            "can_assign_officials",
            "can_manage_scores",
            "assigned_at",
            "assigned_by",
            "assigned_by_username",
        ]
        read_only_fields = ["id", "assigned_at", "assigned_by"]

    def get_user_username(self, obj):
        return obj.user.username if obj.user else None

    def get_gameday_name(self, obj):
        return obj.gameday.name if obj.gameday else None

    def get_gameday_date(self, obj):
        if not obj.gameday:
            return None
        date = obj.gameday.date
        # Handle both date objects and string dates
        return date.isoformat() if hasattr(date, 'isoformat') else date

    def get_assigned_by_username(self, obj):
        return obj.assigned_by.username if obj.assigned_by else None

    def create(self, validated_data):
        from rest_framework.exceptions import ValidationError

        user_id = validated_data.pop("user_id")
        try:
            validated_data["user"] = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise ValidationError({"user_id": f"User with id {user_id} does not exist"})
        return super().create(validated_data)


class TeamManagerSerializer(ModelSerializer):
    """Serializer for TeamManager model"""

    user_username = SerializerMethodField()
    user_id = IntegerField(write_only=True)
    team_name = SerializerMethodField()
    assigned_by_username = SerializerMethodField()

    class Meta:
        model = TeamManager
        fields = [
            "id",
            "user_id",
            "user_username",
            "team",
            "team_name",
            "can_edit_roster",
            "can_submit_passcheck",
            "assigned_at",
            "assigned_by",
            "assigned_by_username",
        ]
        read_only_fields = ["id", "assigned_at", "assigned_by"]

    def get_user_username(self, obj):
        return obj.user.username if obj.user else None

    def get_team_name(self, obj):
        return obj.team.name if obj.team else None

    def get_assigned_by_username(self, obj):
        return obj.assigned_by.username if obj.assigned_by else None

    def create(self, validated_data):
        from rest_framework.exceptions import ValidationError

        user_id = validated_data.pop("user_id")
        try:
            validated_data["user"] = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise ValidationError({"user_id": f"User with id {user_id} does not exist"})
        return super().create(validated_data)
