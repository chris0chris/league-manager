from datetime import datetime

from gamedays.models import Gameday, League, Person
from passcheck.models import EligibilityRule


class ValidationError(Exception):
    pass


class EligibilityValidator:
    def __init__(self, eligible_league: League, gameday: Gameday):
        self.rule: EligibilityRule = EligibilityRule.objects.get(league=eligible_league, eligible_in=gameday.league)
        self.gameday = gameday
        self.validators = []
        self.final_validator = FinalsValidator(gameday.name, self.rule.min_gamedays_for_final, gameday.league.pk)
        self.add_validator(RelegationValidator(gameday.name, self.rule.is_relegation_allowed))
        self.add_validator(MaxGameDaysValidator(gameday.league.pk, self.rule.max_gamedays))
        self.add_validator(self.final_validator)

    def add_validator(self, validator):
        self.validators.append(validator)

    def validate(self, player):
        if self._is_youth_player(player) or self._is_female_player(player):
            return True
        for validator in self.validators:
            if not validator.check(player):
                return False
        return True

    def _is_youth_player(self, player):
        youth_player_validator = YouthPlayerValidator(self.rule.ignore_player_age_until)
        youth_player_validator.set_next_validator(self.final_validator)
        return youth_player_validator.check(player)

    def _is_female_player(self, player):
        woman_player_validator = WomanPlayerValidator(self.rule.except_for_women)
        woman_player_validator.set_next_validator(self.final_validator)
        return woman_player_validator.check(player)

    def _check_for_finals(self, player):
        return self.final_validator.is_valid(player)

    def get_max_subs(self):
        if self.rule.max_subs_in_other_leagues < 0:
            return {}
        return {
            'max_subs_in_other_leagues': self.rule.max_subs_in_other_leagues
        }

    def get_player_strength(self):
        if self.rule.maximum_player_strength < 0:
            return {
                'minimum_player_strength': self.rule.minimum_player_strength,
            }
        return {
            'minimum_player_strength': self.rule.minimum_player_strength,
            'maximum_player_strength': self.rule.maximum_player_strength,
        }


class BaseValidator:
    def __init__(self):
        self.next_validator = None

    def set_next_validator(self, next_validator):
        self.next_validator = next_validator

    def check(self, player):
        if not self.is_valid(player):
            return False
        if self.next_validator:
            return self.next_validator.check(player)
        return True

    def is_valid(self, player) -> bool:
        raise NotImplementedError("Subclasses must implement is_valid.")


class MaxGameDaysValidator(BaseValidator):
    def __init__(self, gameday_league_id: int, max_gamedays: int):
        super().__init__()
        self.gameday_league_id = f'{gameday_league_id}'
        self.max_gamedays = max_gamedays

    def is_valid(self, player):
        if player[self.gameday_league_id] < self.max_gamedays or self.max_gamedays <= 0:
            return True
        raise ValidationError(f"Person hat Maximum an erlaubte Spieltage ({self.max_gamedays}) erreicht.")


class RelegationValidator(BaseValidator):
    def __init__(self, gameday_name: str, is_relegation_allowed: bool):
        super().__init__()
        self.gameday_name = gameday_name.lower()
        self.is_relegation_allowed = is_relegation_allowed

    def is_valid(self, player):
        if 'relegation' in self.gameday_name:
            if self.is_relegation_allowed:
                return True
            raise ValidationError(
                'Person darf nicht an Relegation teilnehmen, weil sie in einer höheren Liga gemeldet ist.')
        return True


class FinalsValidator(BaseValidator):
    def __init__(self, gameday_name, min_gamedays_for_final, league_id):
        super().__init__()
        self.gameday_name = gameday_name.lower()
        self.min_gamedays_for_final = min_gamedays_for_final
        self.league_id = league_id

    def is_valid(self, player):
        if 'final4' in self.gameday_name or 'final8' in self.gameday_name:
            if player[f'{self.league_id}'] >= self.min_gamedays_for_final:
                return True
            raise ValidationError(
                'Person darf nicht an Finaltag teilnehmen, weil sie nicht Mindestanzahl an Spiele erreicht hat.')
        return True


class YouthPlayerValidator(BaseValidator):
    def __init__(self, ignore_player_age_until):
        super().__init__()
        self.ignore_player_age_until = ignore_player_age_until

    def is_valid(self, player):
        from passcheck.api.serializers import RosterSerializer
        player_age = datetime.today().year - player[RosterSerializer.YEAR_OF_BIRTH_C]
        return player_age < self.ignore_player_age_until


class WomanPlayerValidator(BaseValidator):
    def __init__(self, except_for_women):
        super().__init__()
        self.except_for_women = except_for_women

    def is_valid(self, player):
        from passcheck.api.serializers import RosterSerializer
        return self.except_for_women and player[RosterSerializer.SEX_C] == Person.FEMALE
