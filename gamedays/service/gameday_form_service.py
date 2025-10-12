import datetime
from dataclasses import dataclass
from typing import Mapping, Any, cast

from gamedays.models import Gameinfo, Gameday, Team, Gameresult
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.service.wrapper.gameresult_wrapper import GameresultWrapper


@dataclass
class GameinfoForm:
    home: Team
    away: Team
    field: str
    officials: Team
    scheduled: datetime.time
    standing: str

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "GameinfoForm":
        return cls(
            home=cast(Team, data["home"]),
            away=cast(Team, data["away"]),
            field=str(data["field"]),
            officials=cast(Team, data["officials"]),
            scheduled=cast(datetime.time, data["scheduled"]),
            standing=str(data["standing"]),
        )


class GamedayFormService:
    def __init__(self, gameday: Gameday):
        self.gameday = gameday

    def handle_gameinfo_and_gameresult(self, gameinfo_form_dict: dict, gameinfo: Gameinfo):
        gameinfo_form = self._update_gameinfo(gameinfo, gameinfo_form_dict)
        self._create_gameresult_entries(gameinfo, gameinfo_form)

    def _update_gameinfo(self, gameinfo: Gameinfo, gameinfo_form_dict: dict) -> GameinfoForm:
        gameinfo_form = GameinfoForm.from_mapping(gameinfo_form_dict)
        gameinfo_wrapper = GameinfoWrapper.from_instance(gameinfo)
        gameinfo_wrapper.update_gameday(self.gameday)
        return gameinfo_form

    # noinspection PyMethodMayBeStatic
    def _create_gameresult_entries(self, gameinfo: Gameinfo, gameinfo_form: GameinfoForm) -> None:
        gameresult_wrapper = GameresultWrapper(gameinfo)
        gameresult_wrapper.create(team=gameinfo_form.home, is_home=True)
        gameresult_wrapper.create(team=gameinfo_form.away, is_home=False)

    def delete_all_gameinfos_for_gameday(self):
        GameinfoWrapper.delete_by_gameday(self.gameday)
