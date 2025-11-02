import datetime
from dataclasses import dataclass
from typing import Mapping, Any, cast

from gamedays.models import Gameinfo, Gameday, Team
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper


@dataclass
class GameinfoFormData:
    home: Team
    away: Team
    field: str
    officials: Team
    scheduled: datetime.time
    game_started: datetime.time | None
    game_halftime: datetime.time | None
    game_finished: datetime.time | None
    standing: str
    delete: bool
    fh_home: int | None
    sh_home: int | None
    fh_away: int | None
    sh_away: int | None

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "GameinfoFormData":
        return cls(
            home=cast(Team, data["home"]),
            away=cast(Team, data["away"]),
            field=str(data["field"]),
            officials=cast(Team, data["officials"]),
            scheduled=cast(datetime.time, data["scheduled"]),
            game_started=cast(datetime.time, data["gameStarted"]),
            game_halftime=cast(datetime.time, data["gameHalftime"]),
            game_finished=cast(datetime.time, data["gameFinished"]),
            standing=str(data["standing"]),
            delete=bool(data["DELETE"]),
            fh_home=cls._to_int_or_none(data["fh_home"]),
            sh_home=cls._to_int_or_none(data["sh_home"]),
            fh_away=cls._to_int_or_none(data["fh_away"]),
            sh_away=cls._to_int_or_none(data["sh_away"]),
        )

    @classmethod
    def _to_int_or_none(cls, value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None


class GamedayFormService:
    def __init__(self, gameday: Gameday):
        self.gameday = gameday

    def handle_gameinfo_and_gameresult(self, gameinfo_form_dict: dict, gameinfo: Gameinfo):
        gameinfo_form = GameinfoFormData.from_mapping(gameinfo_form_dict)
        if gameinfo_form.delete:
            gameinfo.delete()
            return
        self._update_gameinfo(gameinfo, gameinfo_form)
        self._create_gameresult_entries(gameinfo, gameinfo_form)

    def _update_gameinfo(self, gameinfo: Gameinfo, gameinfo_form: GameinfoFormData) -> GameinfoFormData:
        gameinfo_wrapper = GameinfoWrapper.from_instance(gameinfo)
        gameinfo_wrapper.update_gameday(self.gameday)
        gameinfo_wrapper.update_standing(gameinfo_form.standing)
        return gameinfo_form

    # noinspection PyMethodMayBeStatic
    def _create_gameresult_entries(self, gameinfo: Gameinfo, gameinfo_form: GameinfoFormData) -> None:
        gameresult_wrapper = GameresultWrapper(gameinfo)
        gameresult_wrapper.create(team=gameinfo_form.home, fh=gameinfo_form.fh_home, sh=gameinfo_form.sh_home, pa=self._calc_points_against(gameinfo_form.fh_away, gameinfo_form.sh_away), is_home=True)
        gameresult_wrapper.create(team=gameinfo_form.away, fh=gameinfo_form.fh_away, sh=gameinfo_form.sh_away, pa=self._calc_points_against(gameinfo_form.fh_home, gameinfo_form.sh_home), is_home=False)

    # noinspection PyMethodMayBeStatic
    @staticmethod
    def _calc_points_against(first_half: int | None, second_half: int | None) -> int | None:
        if first_half is None:
           return None
        if second_half is None:
            return first_half
        return first_half + second_half
