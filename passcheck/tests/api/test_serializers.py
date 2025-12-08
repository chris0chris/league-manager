from datetime import time

from django.test import TestCase

from gamedays.models import SeasonLeagueTeam
from gamedays.tests.setup_factories.factories import GamedayFactory
from passcheck.api.serializers import RosterValidationSerializer, PasscheckGamesListSerializer
from passcheck.service.eligibility_validation import EligibilityValidator
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck


class TestPasscheckGamesListSerializer:
    def test_serializer_output(self):
        input_data = [{
            'home': 'TeamA',
            'home_id': 101,
            'away': 'TeamB',
            'away_id': 102,
            'is_checked_home': True,
            'is_checked_away': False,
            'gameday_id': 1,
            'field': 2,
            'scheduled': time(14, 30),
        }]
        serializer = PasscheckGamesListSerializer(input_data, many=True)

        assert dict(serializer.data[0]) == {
            'gameday_id': 1,
            'field': 2,
            'scheduled': '14:30:00',
            'home': {
                'id': 101,
                'name': 'TeamA',
                'isChecked': True,
            },
            'away': {
                'id': 102,
                'name': 'TeamB',
                'isChecked': False,
            },
        }


class TestRosterValidationSerializer(TestCase):
    def test_serializer_is_working_with_validator(self):
        prime_league, _, _, season, second_league_team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(teams=second_league_team)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        ev = EligibilityValidator(season_league.league, prime_gameday)
        league_id = f'{prime_gameday.league_id}'
        second_league_team = [
            {'id': 7, 'player__person__first_name': 'Oscarius', 'player__person__last_name': 'Oldus',
             'jersey_number': 98, 'player__pass_number': 9898989,
             'player__person__sex': 2, 'player__person__year_of_birth': 1909, league_id: 55, 'is_selected': True,
             'gameday_jersey': None, 'left_on': None, 'joined_on': '2006-09-19'},
            {'id': 8, 'team_id': 23, 'player__person__first_name': 'Juli', 'player__person__last_name': 'Jemale',
             'jersey_number': 7,
             'gameday_jersey': 77,
             'player__pass_number': 7,
             'player__person__sex': 1, 'player__person__year_of_birth': 1982, league_id: 7, 'is_selected': False,
             'left_on': '2022-01-07', 'joined_on': '2006-09-19'}, ]
        serializer = RosterValidationSerializer(instance=second_league_team, context={'validator': ev, 'all_leagues': [
            {'gamedays__league': prime_gameday.league_id}]}, many=True).data
        assert len(serializer) == 2
        assert dict(serializer[0]) == {
            'id': 7,
            'first_name': 'O****',
            'last_name': 'O****',
            'joined_on': '2006-09-19',
            'left_on': None,
            'jersey_number': 98,
            'pass_number': 9898989,
            'validationError': 'Person hat Maximum an erlaubte Spieltage (3) erreicht.',
            'isSelected': True,
        }

    def test_serializer_sets_validationError_when_no_validator_is_set(self):
        team = [{'id': 12, 'player__person__first_name': 'Marius', 'player__person__last_name': 'MissingValidator',
                 'jersey_number': 0,
                 'player__pass_number': 0000000,
                 'player__person__sex': 2, 'player__person__year_of_birth': 1909, '1': 0, 'is_selected': False,
                 'gameday_jersey': 7, 'left_on': None, 'joined_on': '2006-09-19'},
                ]
        serializer = RosterValidationSerializer(instance=team, is_staff=True, context={'all_leagues': [
            {'gamedays__league': 1}]}, many=True).data
        assert dict(serializer[0]) == {
            'id': 12,
            'joined_on': '2006-09-19',
            'left_on': None,
            'first_name': 'Marius',
            'last_name': 'MissingValidator',
            'jersey_number': 7,
            'pass_number': 0000000,
            'validationError': 'Could not validate player due missing validator.',
            'isSelected': False,
        }
