import datetime

from django.conf import settings

from gamedays.models import Gameday
from gamedays.service.gameday_service import GamedayService
from gamedays.service.team_service import TeamService
from league_manager.utils.view_utils import UserRequestPermission
from scorecard2.api.serializers import ScorecardGameinfoSerializer, ScorecardGamedaySerializer


class ScorecardException(Exception):
    pass


class ScorecardGamedayService:
    def __init__(self, gameday_id, user_permission: UserRequestPermission):
        self.user_permission = user_permission
        self.gameday_id = gameday_id

    def get_officiating_games(self, team_id):
        gamedays = self._get_gamedays_for_team(team_id)
        gameday_service = GamedayService(self.user_permission)
        gameinfo = gameday_service.get_officiating_gameinfo(gamedays)
        return ScorecardGamedaySerializer(
            instance=self._merge_gamedays_and_gameinfos(gamedays, gameinfo),
            many=True).data

    # noinspection PyMethodMayBeStatic
    def _merge_gamedays_and_gameinfos(self, gamedays, gameinfo):
        all_gamdays = list(gamedays.values(*ScorecardGamedaySerializer.ALL_FIELD_VALUES))
        for current_gameday in all_gamdays:
            current_gameday[ScorecardGamedaySerializer.GAMES_C] = list(
                gameinfo.filter(gameday=current_gameday[ScorecardGamedaySerializer.ID_C]).values(
                    *ScorecardGameinfoSerializer.ALL_FIELD_VALUES)
            )
        return all_gamdays

    def _get_gamedays_for_team(self, team_id):
        officiating_team = TeamService.get_team_by_id_or_name(team_id)
        if self.gameday_id is None:
            date = datetime.datetime.today()
            if settings.DEBUG:
                date = settings.DEBUG_DATE
            gamedays = Gameday.objects.filter(date=date)
        else:
            gamedays = Gameday.objects.filter(id=self.gameday_id)
        if officiating_team is not None or not self.user_permission.is_staff:
            gamedays = Gameday.objects.filter(id__in=gamedays,
                                              gameinfo__officials=officiating_team).distinct()
            if not gamedays.exists():
                raise PermissionError(
                    'Zugriff auf Spieltag nicht erlaubt, da ihr als Team nicht am Spieltag teilnehmt.')
        return gamedays
