from datetime import datetime

from django.conf import settings
from django.db.models import Count, Q, Value, OuterRef, Exists, Subquery

from gamedays.models import Team, Gameinfo, Gameday
from gamedays.service.model_helper import GameresultHelper
from passcheck.api.serializers import PasscheckGamesListSerializer, RosterSerializer, \
    RosterValidationSerializer
from passcheck.models import Playerlist, PlayerlistGameday, TeamRelationship, PasscheckVerification
from passcheck.service.eligibility_validation import EligibilityValidator


class PasscheckService:
    def __init__(self, is_staff=False):
        self.is_staff = is_staff

    def get_officiating_games(self, officials_team):
        date = datetime.today()
        if settings.DEBUG:
            date = '2023-08-05'
        if officials_team is None and self.is_staff:
            gameinfo = Gameinfo.objects.filter(gameday__date=date)
        else:
            gameinfo = Gameinfo.objects.filter(officials_id=officials_team, gameday__date=date)
        gameinfo = gameinfo.annotate(
            home_id=GameresultHelper.get_gameresult_team_subquery(is_home=True, team_column='id'),
            home=GameresultHelper.get_gameresult_team_subquery(is_home=True, team_column='description'),
            away_id=GameresultHelper.get_gameresult_team_subquery(is_home=False, team_column='id'),
            away=GameresultHelper.get_gameresult_team_subquery(is_home=False, team_column='description'),
        )
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

    def get_passcheck_data(self, team_id):
        team = self._get_team(team_id)
        return {
            'officialsTeamName': team.description if team else team_id,
            'games': self.get_officiating_games(officials_team=team),
        }

    def _get_team(self, team_id) -> Team:
        try:
            if type(team_id) is str:
                team = Team.objects.get(name=team_id)
            else:
                team = Team.objects.get(pk=team_id)
            return team
        except Team.DoesNotExist:
            return None

    def get_roster(self, team_id: int, gameday_id: int = None):
        team = self._get_team(team_id)
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
            roster=RosterSerializer(instance=roster, is_staff=self.is_staff,
                                    context={'all_leagues': list(all_leagues)},
                                    many=True).data,
            validator='',
        )
        return {
            'all_leagues': list(all_leagues),
            'team': team_data
        }

    def get_roster_with_validation(self, team_id: int, gameday_id: int):
        gameday: Gameday = Gameday.objects.get(pk=gameday_id)
        roster = self._get_roster(team_id, gameday_id, {})
        team = {'team': TeamData(
            name=self._get_team(team_id).description,
            roster=RosterSerializer(instance=roster, is_staff=self.is_staff, many=True).data,
            validator=EligibilityValidator(gameday.league, gameday).get_player_strength()
        )}
        try:
            official_name = PasscheckVerification.objects.get(team=team_id, gameday=gameday_id).official_name
        except PasscheckVerification.DoesNotExist:
            official_name = ''
        team['official_name'] = official_name
        try:
            relationship = TeamRelationship.objects.get(team=team_id)
            relationship = relationship.additional_teams.all()
        except TeamRelationship.DoesNotExist:
            relationship = []
        additional_teams_serialized = []
        for additional_team_link in relationship:
            additional_relation = additional_team_link.relationship_team
            gameday_league_annotation = {
                f'{gameday.league_id}': Count('gamedays__league',
                                              filter=(Q(gamedays__league=gameday.league) & ~Q(
                                                  gamedays__id=gameday_id)))}
            roster_addiational_team = self._get_roster(additional_relation.team.pk, gameday_id,
                                                       gameday_league_annotation)
            if not roster_addiational_team.exists():
                continue
            ev = EligibilityValidator(additional_relation.league, gameday)
            team_data = TeamData(
                name=additional_relation.team.description,
                roster=RosterValidationSerializer(instance=roster_addiational_team, is_staff=self.is_staff,
                                                  context={'validator': ev, 'all_leagues': [
                                                      {'gamedays__league': gameday.league_id}]
                                                           },
                                                  many=True).data,
                validator=ev.get_max_subs()
            )
            additional_teams_serialized.append(team_data)
        team['additionalTeams'] = additional_teams_serialized
        return team

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


class PasscheckServicePlayers:
    def create_roster_and_passcheck_verification(self, team_id, gameday_id, user, data):
        all_relevant_team_ids = list(
            Team.objects.get(pk=team_id).relationship_additional_teams.all().values_list('team__id', flat=True)) + [
                                    team_id]
        PlayerlistGameday.objects.filter(playerlist__team__in=all_relevant_team_ids, gameday=gameday_id).delete()
        self._create_roster(gameday_id, data['roster'])
        self._create_passcheck_verification(gameday_id, team_id, user, data['official_name'])

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
    def _create_passcheck_verification(self, gameday_id, team_id, user, official_name):
        PasscheckVerification.objects.update_or_create(
            team_id=team_id, gameday_id=gameday_id,
            defaults={
                'official_name': official_name,
                'user': user,
                'gameday_id': gameday_id,
                'team_id': team_id,
            }
        )


class TeamData(dict):
    def __init__(self, name, roster, validator):
        roster = sorted(roster, key=lambda x: x.get('jersey_number'))
        super().__init__(name=name, roster=roster, validator=validator)
