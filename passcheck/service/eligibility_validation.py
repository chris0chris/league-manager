from datetime import datetime

from gamedays.models import Gameday
from passcheck.models import EligibilityRule, Playerlist


class ValidationError(Exception):
    pass


class EligibilityValidator:
    def __init__(self, rule: EligibilityRule, gameday: Gameday):
        self.rule = rule
        self.gameday = gameday
        self.validators = []
        self.add_validator(RelegationValidator(rule, gameday))
        self.add_validator(MaxGameDaysValidator(rule, gameday))
        self.add_validator(FinalsValidator(rule, gameday))

    def add_validator(self, validator):
        self.validators.append(validator)

    def validate(self, player):
        if self._is_youth_player(player):
            return True
        if self._is_female_player(player):
            return True
        for validator in self.validators:
            if not validator.check(player):
                return False
        return True

    def _is_youth_player(self, player):
        player_age = datetime.today().year - player['year_of_birth']
        if player_age < self.rule.ignore_player_age_unitl:
            return self._check_for_finals(player)
        return False

    def _is_female_player(self, player):
        if self.rule.except_for_women and player['sex'] == Playerlist.FEMALE:
            return self._check_for_finals(player)
        return False

    def _check_for_finals(self, player):
        final_validator = FinalsValidator(self.rule, self.gameday)
        return final_validator.check(player)


class BaseValidator:
    def __init__(self, rule: EligibilityRule, gameday: Gameday):
        self.rule = rule
        self.gameday = gameday
        self.next_validator = None

    def set_next_validator(self, next_validator):
        self.next_validator = next_validator

    def check(self, player):
        if not self.is_valid(player):
            return False
        if self.next_validator:
            return self.next_validator.check(player)
        return True

    def is_valid(self, player):
        raise NotImplementedError("Subclasses must implement is_valid.")


class MaxGameDaysValidator(BaseValidator):
    def is_valid(self, player):
        if player[f'{self.gameday.league.pk}'] <= self.rule.max_gamedays:
            return True
        raise ValidationError(f"Person hat Maximum an erlaubte Spieltage ({self.rule.max_gamedays}) überschritten.")


class RelegationValidator(BaseValidator):
    def is_valid(self, player):
        if 'relegation' in self.gameday.name.lower():
            if self.rule.is_relegation_allowed:
                return True
            raise ValidationError(
                'Person darf nicht an Relegation teilnehmen, weil sie in einer höheren Liga gemeldet ist.')
        return True


class FinalsValidator(BaseValidator):
    def is_valid(self, player):
        gameday_name = self.gameday.name.lower()
        if 'final4' in gameday_name or 'final8' in gameday_name:
            if player[f'{self.gameday.league.pk}'] >= self.rule.min_gamedays_for_final:
                return True
            raise ValidationError(
                'Person darf nicht an Finaltag teilnehmen, weil sie nicht Mindestanzahl an Spiele erreicht hat.')
        return True
