import datetime

from django.conf import settings
from django.db.models import QuerySet

from gamedays.models import Gameday, Team, EmptyTeam, Gameinfo
from gamedays.service.game_service import GameService
from gamedays.service.gameday_service import GamedayService
from gamedays.service.team_service import TeamService
from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from league_manager.utils.view_utils import UserRequestPermission
from officials.service.official_service import OfficialService
from scorecard2.api.serializers import ScorecardGameinfoSerializer, ScorecardGamedaySerializer, \
    ScorecardConfigSerializer
from scorecard2.models import ScorecardConfig
from scorecard2.service.wrapper.gamesetup_wrapper import GameSetupWrapper


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
                    *ScorecardGameinfoSerializer.ALL_GAME_OVERVIEW_FIELDS)
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
    def __init__(self, gameinfo_id: int):
        self.gameinfo_wrapper = GameinfoWrapper(gameinfo_id)

    def get_game_info(self):
        gameinfo: QuerySet[Gameinfo] = self.gameinfo_wrapper.get_game_info_with_home_and_away()
        return ScorecardGameinfoSerializer(
            instance=gameinfo.values(*ScorecardGameinfoSerializer.ALL_SETUP_FIELDS).first(),
            fields=ScorecardGameinfoSerializer.ALL_SETUP_FIELDS).data


class ScorecardConfigService:
    def __init__(self, gameinfo_id):
        self.gameinfo_id = gameinfo_id

    def get_kickoff_config(self):
        gameinfo = Gameinfo.objects.get(id=self.gameinfo_id)
        config = ScorecardConfig.objects.filter(leagues=gameinfo.gameday.league).first()
        if config is None:
            raise PermissionError(f'Keine Scorecard-Config für {gameinfo.gameday.league} gefunden.')
        return ScorecardConfigSerializer(instance=config).data


class ScorecardGameSetupService:
    def __init__(self, gameinfo_id):
        self.gameinfo_id = gameinfo_id
        self.game_setup_wrapper = GameSetupWrapper(self.gameinfo_id)

    def save_game_setup(self, data, user):
        categories, was_game_setup_created = self.game_setup_wrapper.create_or_update_game_setup(data.get('categories'))
        officials, officials_errors = self.game_setup_wrapper.create_or_update_game_officials(data.get('officials'))
        v = ''
        if was_game_setup_created:
            game_service = GameService(self.gameinfo_id)
            game_service.update_gamestart(user)
        if len(officials_errors):
            raise ValueError(officials_errors)
        return {'categories': categories, 'officials': officials}

    def get_game_setup(self):
        scorecard_config_service = ScorecardConfigService(self.gameinfo_id)
        official_service = OfficialService()
        gameinfo_service = ScorecardGameService(self.gameinfo_id)
        return {
            "scorecard": scorecard_config_service.get_kickoff_config(),
            "teamOfficials": official_service.get_team_officials_by_gameinfo(self.gameinfo_id),
            "gameInfo": gameinfo_service.get_game_info(),
            "initial": self.game_setup_wrapper.get_game_setup(),
        }
