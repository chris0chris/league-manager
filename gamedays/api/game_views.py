import json
from collections import OrderedDict
from http import HTTPStatus

from rest_framework.exceptions import NotFound
from rest_framework.generics import UpdateAPIView, RetrieveUpdateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import GameFinalizer, GameSetupSerializer, GameLogSerializer
from gamedays.models import Team, Gameinfo, GameSetup, TeamLog
from gamedays.service.game_service import GameService
from gamedays.service.gameday_service import GamedayService
from gamedays.service.model_helper import GameresultHelper, TeamLogHelper


class GameLogAPIView(APIView):

    def get(self, request: Request, *args, **kwargs):
        game_id = kwargs.get('id')
        if request.query_params.get('other') is not None:
            try:
                gamelog = GameService(game_id).get_gamelog()
                return Response(json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict))
            except Gameinfo.DoesNotExist:
                raise NotFound(detail=f'No game found for gameId {game_id}')
        gamelog = Gameinfo.objects.filter(id=game_id).annotate(
            home_id=GameresultHelper.get_gameresult_team_subquery(is_home=True, team_column='id'),
            home=GameresultHelper.get_gameresult_team_subquery(is_home=True, team_column='name'),
            away_id=GameresultHelper.get_gameresult_team_subquery(is_home=False, team_column='id'),
            away=GameresultHelper.get_gameresult_team_subquery(is_home=False, team_column='name'),
            score_home_overall=GameresultHelper.get_gameresult_score(True, True, True),
            score_home_fh=GameresultHelper.get_gameresult_score(True, is_fh=True),
            score_home_sh=GameresultHelper.get_gameresult_score(True, is_sh=True),
            score_away_overall=GameresultHelper.get_gameresult_score(False, True, True),
            score_away_fh=GameresultHelper.get_gameresult_score(False, is_fh=True),
            score_away_sh=GameresultHelper.get_gameresult_score(False, is_sh=True),
        ).values(*GameLogSerializer.ALL_FIELD_VALUES, 'home_id', 'away_id')
        if not gamelog.exists():
            raise NotFound(detail=f'No game found for gameId {game_id}')
        gamelog = list(gamelog)[0]
        gamelog.update({GameLogSerializer.TEAMLOG_HOME: list(
            TeamLog.objects.filter(gameinfo=game_id, team=gamelog['home_id']).exclude(
                event__in=TeamLogHelper.EXCLUDED_EVENTS).order_by('-sequence').values())})
        gamelog.update({GameLogSerializer.TEAMLOG_AWAY: list(
            TeamLog.objects.filter(gameinfo=game_id, team=gamelog['away_id']).exclude(
                event__in=TeamLogHelper.EXCLUDED_EVENTS).order_by('-sequence').values())})
        return Response(GameLogSerializer(instance=gamelog).data)

    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            game_service = GameService(data.get('gameId'))
            gamelog = game_service.create_gamelog(data.get('team'), data.get('event'), request.user, data.get('half'))
            game_service.update_score(gamelog)
            return Response(json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict), status=HTTPStatus.CREATED)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f'Could not create team logs ... gameId {request.data.get("gameId")} not found')
        except Team.DoesNotExist:
            raise NotFound(detail=f'Could not create team logs ... team {request.data.get("team")} not found')

    def delete(self, request: Request, *args, **kwargs):
        game_id = kwargs.get('id')
        try:
            game_service = GameService(game_id)
            gamelog = game_service.delete_gamelog(request.data.get('sequence'))
            game_service.update_score(gamelog)
            return Response(json.loads(gamelog.as_json(), object_pairs_hook=OrderedDict), status=HTTPStatus.OK)
        except Gameinfo.DoesNotExist:
            raise NotFound(detail=f'Could not delete team logs ... gameId {game_id} not found')


class GameHalftimeAPIView(APIView):
    def put(self, request, *args, **kwargs):
        game_service = GameService(kwargs.get('pk'))
        game_service.update_halftime(request.user)
        return Response()


class GameFinalizeUpdateView(UpdateAPIView):
    serializer_class = GameFinalizer
    queryset = GameSetup.objects.all()

    def update(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        game_service = GameService(pk)
        game_service.update_game_finished(request.user)
        game_setup, _ = GameSetup.objects.get_or_create(gameinfo_id=pk)
        serializer = GameFinalizer(instance=game_setup, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=HTTPStatus.OK)
        else:
            return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class GameSetupCreateOrUpdateView(RetrieveUpdateAPIView):
    serializer_class = GameSetupSerializer
    queryset = GameSetup.objects.all()

    def get(self, request, *args, **kwargs):
        game_id = kwargs.get('pk')
        try:
            game_setup = GameSetup.objects.get(gameinfo_id=game_id)
            serializer = GameSetupSerializer(game_setup)
            return Response(serializer.data, status=HTTPStatus.OK)
        except GameSetup.DoesNotExist:
            return Response(data={}, status=HTTPStatus.OK)

    def update(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        game_setup, is_game_setup_created = GameSetup.objects.get_or_create(gameinfo_id=pk)
        serializer = GameSetupSerializer(instance=game_setup, data=request.data)
        if is_game_setup_created:
            game_service = GameService(pk)
            game_service.update_gamestart(request.user)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=HTTPStatus.OK)
        else:
            return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class GamesToWhistleAPIView(APIView):
    def get(self, request, *args, **kwargs):
        gs = GamedayService.create(kwargs['pk'])
        games_to_whistle = gs.get_games_to_whistle(kwargs.get('team'))
        games_to_whistle = games_to_whistle.to_json(orient='records')
        return Response(json.loads(games_to_whistle, object_pairs_hook=OrderedDict))


class GamePossessionAPIView(APIView):
    def put(self, request, *args, **kwargs):
        game_service = GameService(kwargs.get('pk'))
        game_service.update_team_in_possesion(request.data.get('team'))
        return Response()


class ConfigPenalties(APIView):
    def get(self, request, *args, **kwargs):
        penalty_list = [
            {'name': 'illegaler Kontakt Defense', 'subtext': 'BS/1st 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'Flag Guarding', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Fehlstart', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Abschirmen (Blocken) Offense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Kontakt Offense', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': False},
            {'name': 'Abschirmen (Blocken) Defense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'Defense Passbehinderung', 'subtext': 'BS/1st 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'Behinderung Spieldurchführung Defense', 'subtext': 'BS/1st 10', 'isPenaltyAgainstOpponent': True},
            {'name': 'Passverzögerung', 'subtext': 'SL/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegale Ballübergabe', 'subtext': 'SF/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Rückwärtspass', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegales Touching/Ballberührung', 'subtext': 'SL/LoD', 'isPenaltyAgainstOpponent': False},
            {'name': 'Vorwärtsschlagen eines Rückwärtspasses durch das passende Team', 'subtext': 'SF/LoD 5',
             'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Vorwärtspass', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Offense Passbehinderung', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': False},
            {'name': 'Behinderung Spieldurchführung Offense', 'subtext': 'BS/LoD 10',
             'isPenaltyAgainstOpponent': False},
            {'name': 'Springen', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Hechten', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Kick durch Runner', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Snap', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Spielverzögerung Offense', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Spielverzögerung Defense', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'Encroachment', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Shift', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegale Motion', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Lauf', 'subtext': 'SL/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegaler Laufspielzug', 'subtext': 'SL/LoD 5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Defense Offside', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'Störende Signale', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegales Blitzersignal', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegaler Blitz', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegales Flaggenziehen', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegales Treten eines Pass Defense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegales Treten eines Pass Offense', 'subtext': 'BS/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Behinderung an der Seitenlinie Offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'Behinderung an der Seitenlinie Defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegale Spielteilnahme Offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegale Spielteilnahme Defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'illegale Auswechslung Offense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': False},
            {'name': 'illegale Auswechslung Defense', 'subtext': 'SL/5', 'isPenaltyAgainstOpponent': True},
            {'name': 'Unsportliches Verhalten Offense', 'subtext': 'DB/10 Notiz', 'isPenaltyAgainstOpponent': False},
            {'name': 'Unsportliches Verhalten Defense', 'subtext': 'DB/10 Notiz', 'isPenaltyAgainstOpponent': True},
            {'name': 'Grob unsportliches Verhalten Offense', 'subtext': 'Disqualifkation',
             'isPenaltyAgainstOpponent': False},
            {'name': 'Grob unsportliches Verhalten Defense', 'subtext': 'Disqualifkation',
             'isPenaltyAgainstOpponent': True},
            {'name': 'Person mit illegaler Ausrüstung verlässt nicht das Feld Offense', 'subtext': 'DB/TO',
             'isPenaltyAgainstOpponent': False},
            {'name': 'Person mit illegaler Ausrüstung verlässt nicht das Feld Defense', 'subtext': 'DB/TO',
             'isPenaltyAgainstOpponent': True},
            {'name': 'Person mit fehlender vorgeschriebener Ausrüstung verlässt nicht das Feld Offense',
             'subtext': 'DB/TO', 'isPenaltyAgainstOpponent': False},
            {'name': 'Person mit fehlender vorgeschriebener Ausrüstung verlässt nicht das Feld Defense',
             'subtext': 'DB/TO', 'isPenaltyAgainstOpponent': True},
            {'name': 'Person mit blutender Wunde verlässt nicht das Feld Offense', 'subtext': 'DB/TO',
             'isPenaltyAgainstOpponent': False},
            {'name': 'Person mit blutender Wunde verlässt nicht das Feld Defense', 'subtext': 'DB/TO',
             'isPenaltyAgainstOpponent': True},
        ]
        return Response(penalty_list)
