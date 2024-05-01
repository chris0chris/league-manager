from datetime import datetime
from typing import List

from django.conf import settings
from django.db.models import Subquery, OuterRef, F, Q

from gamedays.models import League, Gameday, Gameinfo, Gameresult, TeamLog
from gamedays.service.gameday_settings import SCHEDULED
from liveticker.api.serializers import LivetickerSerializer, TeamlogSerializer


class LivetickerService:
    def __init__(self, league: List, games_with_all_ticks: List, gameday_ids: List):
        self.number_of_ticks = 5
        self._init_gamedays(gameday_ids, league)
        self.games_with_all_ticks = games_with_all_ticks

    def _init_gamedays(self, gameday_ids, league):
        if not league:
            league = League.objects.all()
        else:
            league = League.objects.filter(name__in=league)
        if not gameday_ids:
            today_gamedays = Gameday.objects.filter(date=datetime.today(), league__in=league)
            if settings.DEBUG:
                today_gamedays = Gameday.objects.filter(date=settings.DEBUG_DATE, league__in=league)
            self.gameday_ids = [gameday.pk for gameday in today_gamedays]
        else:
            self.gameday_ids = gameday_ids

    def get_liveticker_as_json(self):
        next_games_list = []
        for gameday_id in self.gameday_ids:
            filter_conditions = Q(gameday=gameday_id, status__in=['1. Halbzeit', '2. Halbzeit'])
            filter_conditions |= self._get_upcoming_slot_filter(gameday_id)
            filter_conditions |= self._get_latest_slot_filter(gameday_id)
            next_games_list += self._get_all_live_games(filter_conditions)
        self._update_next_games_with_teamlog(next_games_list)
        return LivetickerSerializer(instance=next_games_list, many=True).data

    def _update_next_games_with_teamlog(self, next_games_list):
        game: dict
        for game in next_games_list:
            number_of_ticks = self.number_of_ticks
            if game['id'] in self.games_with_all_ticks:
                number_of_ticks = None
            teamlog = TeamLog.objects.filter(gameinfo=game['id']).exclude(isDeleted=True).order_by(
                '-created_time')[slice(None, number_of_ticks)].values(*TeamlogSerializer.ALL_VALUE_FIELDS)
            game.update({LivetickerSerializer.TEAMLOG: list(teamlog)})

    def _get_all_live_games(self, filter_conditions):
        next_games = Gameinfo.objects.filter(filter_conditions).distinct().annotate(
            name_home=self._get_gameresult_team_subquery(is_home=True, team_column='team__name'),
            full_name_home=self._get_gameresult_team_subquery(is_home=True, team_column='team__description'),
            name_away=self._get_gameresult_team_subquery(is_home=False, team_column='team__name'),
            full_name_away=self._get_gameresult_team_subquery(is_home=False, team_column='team__description'),
            score_home=self._get_gameresult_score_subquery(is_home=True),
            score_away=self._get_gameresult_score_subquery(is_home=False),
        ).order_by(f'-{SCHEDULED}').values(*LivetickerSerializer.ALL_VALUE_FIELDS)
        return list(next_games)

    # noinspection PyMethodMayBeStatic
    def _get_gameresult_score_subquery(self, is_home):
        return Subquery(
            Gameresult.objects.filter(gameinfo=OuterRef('id'), isHome=is_home).annotate(
                score=(F('fh') + F('sh'))).values('score')[:1]
        )

    def _get_upcoming_slot_filter(self, gameday_id) -> Q:
        return self._get_slot_filter(gameday_id, True, SCHEDULED)

    def _get_latest_slot_filter(self, gameday_id) -> Q:
        return self._get_slot_filter(gameday_id, False, f'-{SCHEDULED}')

    # noinspection PyMethodMayBeStatic
    def _get_slot_filter(self, gameday_id: int, game_finished_is_null: bool, order_by: str) -> Q:
        time_slot = Gameinfo.objects.filter(
            gameday=gameday_id, gameFinished__isnull=game_finished_is_null).order_by(order_by).first()
        return Q(gameday=gameday_id, scheduled=time_slot.scheduled) if time_slot else Q()

    # noinspection PyMethodMayBeStatic
    def _get_gameresult_team_subquery(self, is_home: bool, team_column: str):
        return Subquery(
            Gameresult.objects.filter(
                gameinfo=OuterRef('id'),
                isHome=is_home
            ).values(team_column)[:1]
        )
