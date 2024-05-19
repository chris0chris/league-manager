from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

from gamedays.models import Gameday
from gamedays.service.gameday_service import GamedayService
from gamedays.service.team_service import TeamService
from league_manager.utils.view_utils import UserRequestPermission
from scorecard2.api.serializers import ScorecardGameinfoSerializer


class ScorecardException(Exception):
    pass


class ScorecardGamedayService:
    def __init__(self, gameday_id, user_permission: UserRequestPermission):
        self.user_permission = user_permission
        self.gameday_id = gameday_id

    def get_officiating_games(self, team_id, all_games_wanted=False):
        team = TeamService.get_team_by_id_or_name(team_id)
        gamedays = Gameday.objects.filter(id=self.gameday_id)
        if settings.DEBUG:
            date = settings.DEBUG_DATE
            gamedays = Gameday.objects.filter(date=date)
        gameday_service = GamedayService(self.user_permission)
        try:
            gameinfo = gameday_service.get_officiating_gameinfo(team, gamedays, all_games_wanted)
        except ObjectDoesNotExist:
            raise ScorecardException('Zugriff auf Spieltag nicht erlaubt, da ihr als Team nicht am Spieltag spielt!')
        if not self.user_permission.is_staff:
            gameinfo = gameinfo.filter(gameFinished__isnull=True)
        return ScorecardGameinfoSerializer(
            instance=gameinfo.values(*ScorecardGameinfoSerializer.ALL_FIELD_VALUES),
            many=True).data
