from datetime import datetime

import pytest
from django.test import TestCase

from gamedays.models import SeasonLeagueTeam, Person
from gamedays.tests.setup_factories.factories import GamedayFactory
from passcheck.api.serializers import RosterSerializer
from passcheck.models import EligibilityRule
from passcheck.service.eligibility_validation import (
    EligibilityValidator,
    MaxGameDaysValidator,
    RelegationValidator,
    ValidationError,
)
from passcheck.tests.setup_factories.db_setup_passcheck import DbSetupPasscheck


class TestValidators(TestCase):
    def test_max_game_days_validator(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        rule = EligibilityRule.objects.get(
            league=season_league.league, eligible_in=prime_gameday.league
        )
        max_game_days_validator = MaxGameDaysValidator(
            prime_gameday.league.pk, rule.max_gamedays
        )
        league_id = f"{prime_gameday.league.pk}"
        with pytest.raises(ValidationError) as exception:
            max_game_days_validator.check({league_id: 3})
        expected_error_message = (
            "Person hat Maximum an erlaubte Spieltage (3) erreicht."
        )
        assert str(exception.value) == expected_error_message
        assert max_game_days_validator.check({league_id: 2}) is True

    def test_is_relegation_allowed_validator(self):
        prime_league, _, third_league, season, team = (
            DbSetupPasscheck.create_eligibility_rules()
        )
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        some_prime_gameday = GamedayFactory(season=season, league=prime_league)
        rule = EligibilityRule.objects.get(
            league=season_league.league, eligible_in=some_prime_gameday.league
        )
        relegation_validator = RelegationValidator(
            some_prime_gameday.name, rule.is_relegation_allowed
        )
        assert relegation_validator.check({}) is True

        prime_relegation_gameday = GamedayFactory(
            season=season, league=prime_league, name="Prime Relegation Gameday"
        )
        rule = EligibilityRule.objects.get(
            league=season_league.league, eligible_in=some_prime_gameday.league
        )
        relegation_validator = RelegationValidator(
            prime_relegation_gameday.name, rule.is_relegation_allowed
        )
        assert relegation_validator.check({}) is True

        third_league_gameday = GamedayFactory(
            season=season, league=third_league, name="Some Relegation Gameday"
        )
        rule = EligibilityRule.objects.get(
            league=season_league.league, eligible_in=third_league_gameday.league
        )
        relegation_validator = RelegationValidator(
            third_league_gameday.name, rule.is_relegation_allowed
        )
        with pytest.raises(ValidationError) as exception:
            relegation_validator.check({})
        expected_error_message = (
            "Person darf nicht an Relegation teilnehmen, "
            "weil sie in einer höheren Liga gemeldet ist."
        )
        assert str(exception.value) == expected_error_message

    def test_youth_player_are_excepted(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        today = datetime.today()
        league_id = f"{prime_gameday.league.pk}"
        youth_player = {
            RosterSerializer.YEAR_OF_BIRTH_C: today.year - 18,
            league_id: 4,
        }
        ev = EligibilityValidator(season_league.league, prime_gameday)
        assert ev.validate(youth_player) is True
        senior_player = {
            RosterSerializer.YEAR_OF_BIRTH_C: today.year - 19,
            league_id: 4,
            RosterSerializer.SEX_C: Person.MALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(senior_player)
        expected_error_message = (
            "Person hat Maximum an erlaubte Spieltage (3) erreicht."
        )
        assert str(exception.value) == expected_error_message

    def test_female_player_are_excepted(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        prime_gameday = GamedayFactory(season=season, league=prime_league)
        league_id = f"{prime_gameday.league.pk}"
        female_player = {
            RosterSerializer.YEAR_OF_BIRTH_C: 1982,
            league_id: 4,
            RosterSerializer.SEX_C: Person.FEMALE,
        }
        ev = EligibilityValidator(season_league.league, prime_gameday)
        assert ev.validate(female_player) is True
        male_player = {
            RosterSerializer.YEAR_OF_BIRTH_C: 1982,
            league_id: 4,
            RosterSerializer.SEX_C: Person.MALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(male_player)
        expected_error_message = (
            "Person hat Maximum an erlaubte Spieltage (3) erreicht."
        )
        assert str(exception.value) == expected_error_message

    def test_validate_final_gameday(self):
        prime_league, _, _, season, team = DbSetupPasscheck.create_eligibility_rules()
        season_league: SeasonLeagueTeam = SeasonLeagueTeam.objects.get(team=team)
        final_gameday = GamedayFactory(
            season=season, league=prime_league, name="Final8"
        )
        league_id = f"{final_gameday.league.pk}"
        ev = EligibilityValidator(season_league.league, final_gameday)
        expected_error_message = (
            "Person darf nicht an Finaltag teilnehmen, "
            "weil sie nicht Mindestanzahl an Spiele erreicht hat."
        )

        female_player = {
            RosterSerializer.YEAR_OF_BIRTH_C: 1982,
            league_id: 1,
            RosterSerializer.SEX_C: Person.FEMALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(female_player)
        assert str(exception.value) == expected_error_message

        youth_player = {
            RosterSerializer.YEAR_OF_BIRTH_C: datetime.today().year - 18,
            league_id: 1,
            RosterSerializer.SEX_C: Person.MALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(youth_player)
        assert str(exception.value) == expected_error_message

        male_player = {
            RosterSerializer.YEAR_OF_BIRTH_C: 1982,
            league_id: 1,
            RosterSerializer.SEX_C: Person.MALE,
        }
        with pytest.raises(ValidationError) as exception:
            ev.validate(male_player)
        assert str(exception.value) == expected_error_message
