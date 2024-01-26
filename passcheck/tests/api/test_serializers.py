from django.test import TestCase

from gamedays.models import SeasonLeagueTeam
from gamedays.tests.setup_factories.factories import GamedayFactory
from passcheck.api.serializers import RosterValidationSerializer
from passcheck.models import EligibilityRule
from passcheck.service.eligibility_validation import EligibilityValidator
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck


class TestRosterValidationSerializer(TestCase):
    def test_serializer_is_working_with_validator(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        rule = EligibilityRule.objects.get(league=season_league.league, eligible_in=prime_gameday.league)
        ev = EligibilityValidator(rule, prime_gameday)
        league_id = f'{prime_gameday.league_id}'
        team = [{'first_name': 'Oscarius', 'last_name': 'Oldus', 'jersey_number': 98, 'pass_number': 9898989,
                 'sex': 2, 'year_of_birth': 1909, league_id: 55},
                {'id': 8, 'team_id': 23, 'first_name': 'Juli', 'last_name': 'Jemale', 'jersey_number': 7,
                 'pass_number': 7,
                 'sex': 1, 'year_of_birth': 1982, league_id: 7}, ]
        serializer = RosterValidationSerializer(instance=team, context={'validator': ev, 'all_leagues': [
            {'gamedays__league': prime_gameday.league_id}]}, many=True).data
        assert len(serializer) == 2
        assert dict(serializer[0]) == {
            'first_name': 'O****',
            'last_name': 'O****',
            'jersey_number': 98,
            'pass_number': 9898989,
            'validationError': 'Person hat Maximum an erlaubte Spieltage (3) überschritten.'
        }

    def test_serializer_sets_validationError_when_no_validator_is_set(self):
        team = [{'first_name': 'Marius', 'last_name': 'MissingValidator', 'jersey_number': 0, 'pass_number': 0000000,
                 'sex': 2, 'year_of_birth': 1909, '1': 0},
                ]
        serializer = RosterValidationSerializer(instance=team, is_staff=True, context={'all_leagues': [
            {'gamedays__league': 1}]}, many=True).data
        assert dict(serializer[0]) == {
            'first_name': 'Marius',
            'last_name': 'MissingValidator',
            'jersey_number': 0,
            'pass_number': 0000000,
            'validationError': 'Could not validate player due missing validator.'
        }
