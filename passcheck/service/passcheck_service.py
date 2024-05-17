import datetime

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count, Q, Value, OuterRef, Exists, Subquery, IntegerField

from gamedays.api.serializers import GamedayInfoSerializer
from gamedays.models import Team, Gameinfo, Gameday
from gamedays.service.gameday_service import GamedayService
from gamedays.service.team_service import TeamService
from league_manager.utils.view_utils import UserRequestPermission
from passcheck.api.serializers import PasscheckGamesListSerializer, RosterSerializer, \
    RosterValidationSerializer, PlayerAllGamedaysSerializer
from passcheck.models import Playerlist, PlayerlistGameday, TeamRelationship, PasscheckVerification, \
    EmptyPasscheckVerification, EligibilityRule
from passcheck.service.eligibility_validation import EligibilityValidator


class PasscheckException(Exception):
    pass


class PasscheckService:
    def __init__(self, user_permission=UserRequestPermission()):
        self.user_permission = user_permission

    def get_officiating_games(self, officials_team: Team, gameday, all_games_wanted=False):
        gameday_service = GamedayService(self.user_permission)
        try:
            gameinfo = gameday_service.get_officiating_gameinfo(officials_team, gameday, all_games_wanted)
        except ObjectDoesNotExist:
            raise PasscheckException('Passcheck nicht erlaubt, da ihr als Team nicht am Spieltag spielt!')
        if officials_team is not None and not all_games_wanted:
            gameinfo = gameinfo.filter(scheduled__lte=gameinfo.first().scheduled)
        gameinfo = gameinfo.annotate(
            is_checked_home=Exists(PasscheckVerification.objects.filter(
                team=OuterRef('home_id'),
                gameday=OuterRef('gameday_id'))),
            is_checked_away=Exists(PasscheckVerification.objects.filter(
                team=OuterRef('away_id'),
                gameday=OuterRef('gameday_id')))
        )
        return PasscheckGamesListSerializer(
            gameinfo.values(*PasscheckGamesListSerializer.ALL_FIELD_VALUES),
            many=True
        ).data

    def get_passcheck_games(self, team_id, gameday_id=None):
        team = TeamService.get_team_by_id_or_name(team_id)
        date = datetime.datetime.today()
        if settings.DEBUG:
            date = settings.DEBUG_DATE
        today_gamedays = Gameday.objects.filter(date=date)
        all_games_wanted = False
        if gameday_id is None:
            gameday = today_gamedays
        else:
            gameday = Gameday.objects.filter(id=gameday_id)
            all_games_wanted = True

        return {
            'officialsTeamName': team.description if team else team_id,
            'games': self.get_officiating_games(officials_team=team, gameday=gameday,
                                                all_games_wanted=all_games_wanted),
            'gamedays': GamedayInfoSerializer(instance=today_gamedays.values('id', 'name', 'league__name'),
                                              many=True).data
        }

    def get_roster(self, team_id: int, gameday_id: int = None):
        team = TeamService.get_team_by_id_or_name(team_id)
        all_leagues = Playerlist.objects.filter(team=team).exclude(gamedays__league__name=None).distinct().values(
            'gamedays__league', 'gamedays__league__name')
        league_annotations = {
            f'{league["gamedays__league"]}': Count('gamedays__league',
                                                   filter=Q(gamedays__league=league['gamedays__league'])) for
            league in all_leagues
        }
        roster = self._get_roster(team, gameday_id, league_annotations)
        team_data = TeamData(
            name=team.description,
            roster=RosterSerializer(instance=roster, is_staff=(self.user_permission.is_user_or_staff()),
                                    context={'all_leagues': list(all_leagues)},
                                    many=True).data,
            validator='',
        )
        return {
            'is_user_or_staff': self.user_permission.is_user_or_staff(),
            'all_leagues': list(all_leagues),
            'team': team_data,
            'team_id': team_id,
            'related_teams': list(team.relationship_additional_teams.all().values('team__description', 'team__id')),
        }

    def get_roster_with_validation(self, team_id: int, gameday_id: int):
        gameday: Gameday = Gameday.objects.get(pk=gameday_id)
        if not self.user_permission.is_staff:
            today = datetime.date.today()
            if settings.DEBUG:
                today = settings.DEBUG_DATE
            if today != gameday.date:
                raise PasscheckException(
                    f'Passcheck nicht erlaubt für Spieltag: {gameday_id}. Nur heutige Spieltage sind erlaubt.')
        roster = self._get_roster(team_id, gameday_id, {})
        team = {'team': TeamData(
            name=TeamService.get_team_by_id_or_name(team_id).description,
            roster=RosterSerializer(instance=roster, is_staff=self.user_permission.is_user_or_staff(), many=True).data,
            validator=EligibilityValidator(gameday.league, gameday).get_player_strength()
        )}
        try:
            passcheck_verification = PasscheckVerification.objects.get(team=team_id, gameday=gameday_id)
        except PasscheckVerification.DoesNotExist:
            passcheck_verification = EmptyPasscheckVerification()
        team['official_name'] = passcheck_verification.official_name
        team['note'] = passcheck_verification.note
        relationship = self._get_team_relationship(team_id)
        additional_teams_serialized = []
        for additional_team_link in relationship:
            try:
                additional_relation = additional_team_link.relationship_team
                gameday_league_annotation = {
                    f'{gameday.league_id}': Count('gamedays__league',
                                                  filter=(Q(gamedays__league=gameday.league) &
                                                          Q(gamedays__date__year=gameday.date.year) &
                                                          ~Q(gamedays__id=gameday_id)))}
                roster_addiational_team = self._get_roster(additional_relation.team.pk, gameday_id,
                                                           gameday_league_annotation)
                if not roster_addiational_team.exists():
                    continue
                ev = EligibilityValidator(additional_relation.league, gameday)
                team_data = TeamData(
                    name=additional_relation.team.description,
                    roster=RosterValidationSerializer(instance=roster_addiational_team,
                                                      is_staff=self.user_permission.is_user_or_staff(),
                                                      context={'validator': ev, 'all_leagues': [
                                                          {'gamedays__league': gameday.league_id}]
                                                               },
                                                      many=True).data,
                    validator=ev.get_max_subs()
                )
            except Team.relationship_team.RelatedObjectDoesNotExist:
                team_data = TeamData(f'{additional_team_link.description} -> fehlt als Relationship Team', [], {})
            except EligibilityRule.DoesNotExist:
                team_data = TeamData(f'{additional_team_link.description} -> darf nicht in der Liga spielen', [], {})
            additional_teams_serialized.append(team_data)
        team['additionalTeams'] = additional_teams_serialized
        return team

    def _get_team_relationship(self, team_id):
        try:
            relationship = TeamRelationship.objects.get(team=team_id)
            relationship = relationship.additional_teams.all()
        except TeamRelationship.DoesNotExist:
            relationship = []
        return relationship

    def _get_roster(self, team, gameday_id, league_annotations):
        is_selected_query = self._is_selected_query(gameday_id)
        gameday_jersey = self._get_gameday_jersey_query(gameday_id)
        return Playerlist.objects.filter(team=team).annotate(
            **league_annotations,
            is_selected=is_selected_query,
            gameday_jersey=gameday_jersey
        ).values()

    def _is_selected_query(self, gameday_id):
        if gameday_id is None:
            is_selected_query = Value(False)
        else:
            is_selected_query = Exists(
                PlayerlistGameday.objects.filter(
                    playerlist=OuterRef('id'),
                    gameday=gameday_id
                )
            )
        return is_selected_query

    def _get_gameday_jersey_query(self, gameday_id):
        return Subquery(
            PlayerlistGameday.objects.filter(playerlist=OuterRef('id'), gameday=gameday_id).values('gameday_jersey')
        )

    def get_player_gamedays(self, player_id):
        player = Playerlist.objects.filter(id=player_id)
        all_gamedays = PlayerlistGameday.objects.filter(playerlist__in=player)
        all_leagues = all_gamedays.values_list('gameday__league__name', flat=True).distinct()
        all_years = all_gamedays.values_list('gameday__date__year', flat=True).distinct()
        all_gamedays = all_gamedays.order_by('gameday__league', 'gameday__date')
        league_list = []
        for current_league in all_leagues:
            league_list.append({
                'league_name': current_league,
                'gamedays': PlayerAllGamedaysSerializer(
                    instance=all_gamedays.filter(gameday__league__name=current_league).values('gameday__date',
                                                                                              'gameday__name',
                                                                                              'id'),
                    many=True).data
            })
        player_values = player.annotate(
            gameday_jersey=Value(None, output_field=IntegerField()),
            is_selected=Value(False)).values()
        team = player.first().team
        return {
            'years': all_years,
            'team': team.description,
            'team_id': team.id,
            'player': RosterSerializer(instance=player_values, is_staff=self.user_permission.is_user_or_staff(),
                                       many=True).data[0],
            'entries': league_list,
        }

    def get_passcheck_status(self, officials_team: str):
        team = TeamService.get_team_by_id_or_name(officials_team)
        if team is None:
            return {
                'completed': False
            }
        date = datetime.datetime.today()
        if settings.DEBUG:
            date = settings.DEBUG_DATE
        today_gamedays = Gameday.objects.filter(date__gte=date)
        gameinfo = Gameinfo.objects.filter(officials_id=team, gameday__in=today_gamedays).order_by(
            'scheduled')
        games_to_check = gameinfo.filter(scheduled__lte=gameinfo.first().scheduled)
        number_of_teams_to_check = games_to_check.count() * 2
        verified_teams = PasscheckVerification.objects.filter(user__username=officials_team, gameday__in=today_gamedays)
        return {
            'completed': True if number_of_teams_to_check == verified_teams.count() else False
        }


class PasscheckServicePlayers:
    def create_roster_and_passcheck_verification(self, team_id, gameday_id, user, data):
        all_relevant_team_ids = list(
            Team.objects.get(pk=team_id).relationship_additional_teams.all().values_list('team__id', flat=True)) + [
                                    team_id]
        PlayerlistGameday.objects.filter(playerlist__team__in=all_relevant_team_ids, gameday=gameday_id).delete()
        self._create_roster(gameday_id, data['roster'])
        self._create_passcheck_verification(gameday_id, team_id, user, data.get('official_name'), data.get('note'))

    # noinspection PyMethodMayBeStatic
    def _create_roster(self, gameday_id, roster: []):
        for player in roster:
            player_id = player['id']
            PlayerlistGameday.objects.update_or_create(playerlist_id=player_id, gameday_id=gameday_id, defaults={
                'playerlist_id': player_id,
                'gameday_id': gameday_id,
                'gameday_jersey': player['jersey_number'],
            })

    # noinspection PyMethodMayBeStatic
    def _create_passcheck_verification(self, gameday_id, team_id, user, official_name, note):
        PasscheckVerification.objects.update_or_create(
            team_id=team_id, gameday_id=gameday_id,
            defaults={
                'official_name': official_name,
                'user': user,
                'gameday_id': gameday_id,
                'team_id': team_id,
                'note': note,
            }
        )


class TeamData(dict):
    def __init__(self, name, roster, validator):
        roster = sorted(roster, key=lambda x: x.get('jersey_number'))
        super().__init__(name=name, roster=roster, validator=validator)
