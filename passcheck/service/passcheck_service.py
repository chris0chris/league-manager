from datetime import datetime
from urllib.parse import unquote

from django.conf import settings
from django.db.models import Count, Q, Value, OuterRef, Exists

from gamedays.models import Team, Gameinfo, Gameday
from gamedays.service.model_helper import GameresultHelper
from passcheck.api.serializers import PasscheckGamesListSerializer, PasscheckSerializer, RosterSerializer, \
    RosterValidationSerializer
from passcheck.models import Playerlist, EligibilityRule, PlayerlistGameday, TeamRelationship
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

    def _get_team(self, team_id):
        try:
            if type(team_id) is str:
                team = Team.objects.get(name=team_id)
            else:
                team = Team.objects.get(pk=team_id)
            return team
        except Team.DoesNotExist:
            return None

    def get_roster(self, team_id: int, gameday_id: int = None):
        all_leagues = Playerlist.objects.filter(team_id=team_id).exclude(gamedays__league__name=None).distinct().values(
            'gamedays__league', 'gamedays__league__name')
        league_annotations = {
            f'{league["gamedays__league"]}': Count('gamedays__league',
                                                   filter=Q(gamedays__league=league['gamedays__league'])) for
            league in all_leagues
        }
        roster = self._get_roster(team_id, gameday_id, league_annotations)
        return {
            'all_leagues': list(all_leagues),
            'roster': RosterSerializer(instance=roster, is_staff=self.is_staff,
                                       context={'all_leagues': list(all_leagues)},
                                       many=True).data
        }

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

    def get_roster_with_validation(self, team_id: int, gameday_id: int):
        gameday: Gameday = Gameday.objects.get(pk=gameday_id)
        roster = self.get_roster(team_id, gameday_id)
        try:
            relationship = TeamRelationship.objects.get(team=team_id)
            relationship = relationship.additional_teams.all()
        except TeamRelationship.DoesNotExist:
            relationship = []
        additional_rosters_serialized = []
        for additional_team_link in relationship:
            additional_relation = additional_team_link.relationship_team.first()
            rule = EligibilityRule.objects.get(league=additional_relation.league, eligible_in=gameday.league)
            gameday_league_annotation = {
                f'{gameday.league_id}': Count('gamedays__league',
                                              filter=Q(gamedays__league=gameday.league))}
            roster_addiational_team = self._get_roster(additional_relation.team.pk, gameday_id,
                                                       gameday_league_annotation)
            if not roster_addiational_team.exists():
                continue
            ev = EligibilityValidator(rule, gameday)
            additional_rosters_serialized.append(
                {
                    'name': additional_relation.team.description,
                    'roster': RosterValidationSerializer(instance=roster_addiational_team, is_staff=self.is_staff,
                                                         context={'validator': ev, 'all_leagues': [
                                                             {'gamedays__league': gameday.league_id}]
                                                                  },
                                                         many=True).data
                }
            )
        roster['additionalRosters'] = additional_rosters_serialized
        return roster

    def _get_roster(self, team_id, gameday_id, league_annotations):
        is_selected_query = self._is_selected_query(gameday_id)
        return Playerlist.objects.filter(team=team_id).annotate(
            **league_annotations,
            is_selected=is_selected_query
        ).values()


class PasscheckServicePlayers:
    def get_players(self, team):
        return PasscheckSerializer(Playerlist.objects.filter(team__description=team), many=True).data

    def get_playerlist_data(self, team):
        description = unquote(team)
        return {
            'players': self.get_players(team=description),
            'otherPlayers': self.get_players(team=description),
            # 'otherPlayers': self.get_other_players(team=team),
        }

    def create_roster(self, team_id, gameday_id, roster):
        PlayerlistGameday.objects.filter(playerlist__team=team_id).delete()
        for player in roster:
            player_id = player['id']
            PlayerlistGameday.objects.update_or_create(playerlist_id=player_id, gameday_id=gameday_id, defaults={
                'playerlist_id': player_id,
                'gameday_id': gameday_id,
                'gameday_jersey': player['jersey_number'],
            })
