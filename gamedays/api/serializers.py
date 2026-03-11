import logging

from rest_framework.fields import SerializerMethodField, IntegerField
from rest_framework.serializers import ModelSerializer, Serializer

from gamedays.models import (
    Gameday,
    Gameinfo,
    GameOfficial,
    GameSetup,
    Season,
    League,
    Gameresult,
)

logger = logging.getLogger(__name__)


class SeasonSerializer(ModelSerializer):
    class Meta:
        model = Season
        fields = ["id", "name"]


class LeagueSerializer(ModelSerializer):
    class Meta:
        model = League
        fields = ["id", "name"]


class GamedaySerializer(ModelSerializer):
    class Meta:
        model = Gameday
        fields = "__all__"
        read_only_fields = ["author"]
        extra_kwargs = {"start": {"format": "%H:%M"}}


class GamedayListSerializer(ModelSerializer):
    season_display = SerializerMethodField()
    league_display = SerializerMethodField()

    class Meta:
        model = Gameday
        fields = [
            "id",
            "name",
            "season",
            "season_display",
            "league",
            "league_display",
            "date",
            "start",
            "format",
            "author",
            "address",
            "status",
        ]
        read_only_fields = ["author"]
        extra_kwargs = {"start": {"format": "%H:%M"}}

    def get_season_display(self, obj):
        return obj.season.name if obj.season else ""

    def get_league_display(self, obj):
        return obj.league.name if obj.league else ""


class GamedayInfoSerializer(Serializer):
    id = IntegerField()
    name = SerializerMethodField()

    def get_name(self, obj: dict):
        return f"{obj['name']} ({obj['league__name']})"


class GameOfficialSerializer(ModelSerializer):
    class Meta:
        model = GameOfficial
        exclude = ("gameinfo",)


class GameinfoSerializer(ModelSerializer):
    halftime_score = SerializerMethodField()
    final_score = SerializerMethodField()

    class Meta:
        model = Gameinfo
        fields = [
            "status",
            "gameStarted",
            "gameHalftime",
            "gameFinished",
            "halftime_score",
            "final_score",
        ]
        extra_kwargs = {
            "gameStarted": {"format": "%H:%M"},
            "gameHalftime": {"format": "%H:%M"},
            "gameFinished": {"format": "%H:%M"},
        }

    def _get_scores(self, obj):
        results = Gameresult.objects.filter(gameinfo=obj)
        scores = {"home_fh": 0, "home_sh": 0, "away_fh": 0, "away_sh": 0}
        for r in results:
            prefix = "home" if r.isHome else "away"
            scores[f"{prefix}_fh"] = r.fh or 0
            scores[f"{prefix}_sh"] = r.sh or 0
        return scores

    def get_halftime_score(self, obj):
        scores = self._get_scores(obj)
        return {"home": scores["home_fh"], "away": scores["away_fh"]}

    def get_final_score(self, obj):
        scores = self._get_scores(obj)
        return {
            "home": scores["home_fh"] + scores["home_sh"],
            "away": scores["away_fh"] + scores["away_sh"],
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
        name = obj[self.HOME_TEAM] if is_home else obj[self.AWAY_TEAM]
        if name is None:
            from gamedays.service.placeholder_service import GamedayPlaceholderService

            name = GamedayPlaceholderService.resolve_placeholder(obj[self.ID], is_home)
        return {
            "name": name,
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
