from datetime import datetime

import pytest
from django.test import TestCase

from gamedays.models import SeasonLeagueTeam
from gamedays.tests.setup_factories.factories import GamedayFactory
from passcheck.models import EligibilityRule, Playerlist
from passcheck.service.eligibility_validation import EligibilityValidator, MaxGameDaysValidator, \
    RelegationValidator, ValidationError
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck


class TestValidators(TestCase):
    def test_max_game_days_validator(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        rule = EligibilityRule.objects.get(league=season_league.league, eligible_in=prime_gameday.league)
        max_game_days_validator = MaxGameDaysValidator(rule, prime_gameday)
        league_id = f'{prime_gameday.league.pk}'
        with pytest.raises(ValidationError) as exception:
            max_game_days_validator.check({league_id: 4})
        expected_error_message = "Person hat Maximum an erlaubte Spieltage (3) überschritten."
        assert str(exception.value) == expected_error_message
        assert max_game_days_validator.check({league_id: 3}) is True

    def test_is_relegation_allowed_validator(self):
        prime_league, _, third_league, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        some_prime_gameday = GamedayFactory(season=season, league=prime_league)
        rule = EligibilityRule.objects.get(league=season_league.league, eligible_in=some_prime_gameday.league)
        relegation_validator = RelegationValidator(rule, some_prime_gameday)
        assert relegation_validator.check({}) is True

        prime_relegation_gameday = GamedayFactory(season=season, league=prime_league, name='Prime Relegation Gameday')
        rule = EligibilityRule.objects.get(league=season_league.league, eligible_in=some_prime_gameday.league)
        relegation_validator = RelegationValidator(rule, prime_relegation_gameday)
        assert relegation_validator.check({}) is True

        third_league_gameday = GamedayFactory(season=season, league=third_league, name='Some Relegation Gameday')
        rule = EligibilityRule.objects.get(league=season_league.league, eligible_in=third_league_gameday.league)
        relegation_validator = RelegationValidator(rule, third_league_gameday)
        with pytest.raises(ValidationError) as exception:
            relegation_validator.check({})
        expected_error_message = ("Person darf nicht an Relegation teilnehmen, "
                                  "weil sie in einer höheren Liga gemeldet ist.")
        assert str(exception.value) == expected_error_message

    def test_youth_player_are_excepted(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        rule = EligibilityRule.objects.get(league=season_league.league, eligible_in=prime_gameday.league)
        today = datetime.today()
        league_id = f'{prime_gameday.league.pk}'
        youth_player = {
            'year_of_birth': today.year - 18,
            league_id: 4,
        }
        ev = EligibilityValidator(rule, prime_gameday)
        assert ev.validate(youth_player) is True
        senior_player = {
            'year_of_birth': today.year - 19,
            league_id: 4,
            'sex': Playerlist.MALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(senior_player)
        expected_error_message = "Person hat Maximum an erlaubte Spieltage (3) überschritten."
        assert str(exception.value) == expected_error_message

    def test_female_player_are_excepted(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        rule = EligibilityRule.objects.get(league=season_league.league, eligible_in=prime_gameday.league)
        league_id = f'{prime_gameday.league.pk}'
        female_player = {
            'year_of_birth': 1982,
            league_id: 4,
            'sex': Playerlist.FEMALE,
        }
        ev = EligibilityValidator(rule, prime_gameday)
        assert ev.validate(female_player) is True
        male_player = {
            'year_of_birth': 1982,
            league_id: 4,
            'sex': Playerlist.MALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(male_player)
        expected_error_message = "Person hat Maximum an erlaubte Spieltage (3) überschritten."
        assert str(exception.value) == expected_error_message

    def test_validate_final_gameday(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        final_gameday = GamedayFactory(season=season, league=prime_league, name='Final8')
        rule = EligibilityRule.objects.get(league=season_league.league, eligible_in=final_gameday.league)
        league_id = f'{final_gameday.league.pk}'
        ev = EligibilityValidator(rule, final_gameday)
        expected_error_message = 'Person darf nicht an Finaltag teilnehmen, weil sie nicht Mindestanzahl an Spiele erreicht hat.'

        female_player = {
            'year_of_birth': 1982,
            league_id: 1,
            'sex': Playerlist.FEMALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(female_player)
        assert str(exception.value) == expected_error_message

        youth_player = {
            'year_of_birth': datetime.today().year - 18,
            league_id: 1,
            'sex': Playerlist.MALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(youth_player)
        assert str(exception.value) == expected_error_message

        male_player = {
            'year_of_birth': 1982,
            league_id: 1,
            'sex': Playerlist.MALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(male_player)
        assert str(exception.value) == expected_error_message
