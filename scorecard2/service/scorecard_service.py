import datetime

from django.conf import settings
from django.db.models import QuerySet

from gamedays.models import Gameday, Team, EmptyTeam, Gameinfo
from gamedays.service.gameday_service import GamedayService
from gamedays.service.team_service import TeamService
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from league_manager.utils.view_utils import UserRequestPermission
from scorecard2.api.serializers import ScorecardGameinfoSerializer, ScorecardGamedaySerializer, \
    ScorecardConfigSerializer
from scorecard2.models import ScorecardConfig


class ScorecardGamedayService:
    def __init__(self, gameday_id, user_permission: UserRequestPermission):
        self.user_permission = user_permission
        self.gameday_id = gameday_id

    def get_officiating_games(self, team_id):
        officiating_team = TeamService.get_team_by_id_or_name(team_id)
        gamedays = self._get_gamedays_for_team(officiating_team)
        gameday_service = GamedayService(self.user_permission)
        gameinfo = gameday_service.get_officiating_gameinfo(gamedays)
        return {
            "officiatingTeamId": officiating_team.id,
            "gamedays": ScorecardGamedaySerializer(
                instance=self._merge_gamedays_and_gameinfos(gamedays, gameinfo),
                many=True).data}

    # noinspection PyMethodMayBeStatic
    def _merge_gamedays_and_gameinfos(self, gamedays, gameinfo):
        all_gamdays = list(gamedays.values(*ScorecardGamedaySerializer.ALL_FIELD_VALUES))
        for current_gameday in all_gamdays:
            current_gameday[ScorecardGamedaySerializer.GAMES_C] = list(
                gameinfo.filter(gameday=current_gameday[ScorecardGamedaySerializer.ID_C]).values(
                    *ScorecardGameinfoSerializer.ALL_GAME_OVERVIEW_VALUES)
            )
        return all_gamdays

    def _get_gamedays_for_team(self, officiating_team: Team):
        date = datetime.datetime.today()
        if settings.DEBUG:
            date = settings.DEBUG_DATE
        if self.gameday_id is None:
            gamedays = Gameday.objects.filter(date=date)
        else:
            gamedays = Gameday.objects.filter(id=self.gameday_id)
        if type(officiating_team) is not EmptyTeam or not self.user_permission.is_staff:
            gamedays = Gameday.objects.filter(id__in=gamedays,
                                              gameinfo__officials=officiating_team).distinct()
            if not gamedays.exists():
                raise PermissionError(
                    'Zugriff auf Spieltag nicht erlaubt, da ihr als Team nicht am Spieltag teilnehmt.')
            gamedays = gamedays.filter(date=date)
            if not gamedays.exists():
                raise PermissionError(
                    'Zugriff auf Spieltag nicht erlaubt, da der Spieltag nicht heute stattfindet.')
        return gamedays


class ScorecardGameService:
    def __init__(self, gameinfo_id: int, user_permission: UserRequestPermission):
        self.user_permission = user_permission
        self.gameinfo_wrapper = GameinfoWrapper(gameinfo_id, user_permission)

    def get_game_info(self):
        gameinfo: QuerySet[Gameinfo] = self.gameinfo_wrapper.get_game_info_with_home_and_away()
        return ScorecardGameinfoSerializer(
            instance=gameinfo.values(*ScorecardGameinfoSerializer.ALL_SETUP_VALUES).first(),
            fields=ScorecardGameinfoSerializer.ALL_SETUP_VALUES).data


class ScorecardConfigService:
    def __init__(self, gameinfo_id):
        self.gameinfo_id = gameinfo_id

    def get_kickoff_config(self):
        gameinfo = Gameinfo.objects.get(id=self.gameinfo_id)
        config = ScorecardConfig.objects.filter(leagues=gameinfo.gameday.league).first()
        if config is None:
            raise PermissionError(f'Keine Scorecard-Config für {gameinfo.gameday.league} gefunden.')
        return ScorecardConfigSerializer(instance=config).data
