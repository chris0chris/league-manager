import {Roster, TeamValidator} from '../common/types';

abstract class BaseValidator {
  check(roster: Roster): boolean {
    if (!this.isValid(roster)) {
      return false;
    }
    if (this.nextValidator) {
      return this.nextValidator.check(roster);
    }
    return true;
  }
  abstract isValid(roster: Roster): boolean;
  abstract getValidationError(): string;

  nextValidator: BaseValidator | null;
  constructor() {
    this.nextValidator = null;
  }

  setNextValidator(validator: BaseValidator) {
    this.nextValidator = validator;
  }

  protected countSelectedPlayers(roster: Roster) {
    return roster.filter((player) => player.isSelected).length;
  }

  protected handleValidationErrorUpdated(
    roster: Roster,
    checkValue: number
  ): boolean {
    const selectedPlayers = this.countSelectedPlayers(roster);
    const isValid = selectedPlayers < checkValue;
    roster.forEach((player) => {
      if (!isValid && !player.isSelected) {
        if (!player.validationError) {
          player.validationError = this.getValidationError();
        }
      } else {
        if (player.validationError === this.getValidationError()) {
          delete player.validationError;
        }
      }
    });
    return isValid;
  }
}

class MaxSubsInOtherLeagues extends BaseValidator {
  maxSubsInOtherLeagues: number;
  constructor(maxSubsInOtherLeagues: number) {
    super();
    this.maxSubsInOtherLeagues = maxSubsInOtherLeagues;
  }
  isValid(roster: Roster): boolean {
    return this.handleValidationErrorUpdated(
      roster,
      this.maxSubsInOtherLeagues
    );
  }
  getValidationError(): string {
    return `Maximale Anzahl an Durchlässigkeitsregel erreicht, da bereits ${this.maxSubsInOtherLeagues} Personen ausgewählt wurden.
    Zum Auswählen muss eine vorherige Auswahl verworfen werden.`;
  }
}

export class MinimumPlayerStrengthValidator extends BaseValidator {
  minimumPlayerStrengthValidator: number;
  constructor(minimumPlayerStrengthValidator: number) {
    super();
    this.minimumPlayerStrengthValidator = minimumPlayerStrengthValidator;
  }
  isValid(roster: Roster): boolean {
    return (
      this.countSelectedPlayers(roster) >= this.minimumPlayerStrengthValidator
    );
  }
  getValidationError(): string {
    return `Mindestspielstärke von ${this.minimumPlayerStrengthValidator} Personen wurde nicht erreicht`;
  }
}

export class MaximumPlayerStrengthValidator extends BaseValidator {
  maximumPlayerStrength: number;
  constructor(maximumPlayerStrengthValidator: number) {
    super();
    this.maximumPlayerStrength = maximumPlayerStrengthValidator;
  }
  isValid(roster: Roster): boolean {
    return this.handleValidationErrorUpdated(
      roster,
      this.maximumPlayerStrength
    );
  }
  getValidationError(): string {
    return `Maximalspielstärke von ${this.maximumPlayerStrength} Personen wurde erreicht.
    Zum Auswählen muss eine vorherige Auswahl verworfen werden.`;
  }
}

class Validator {
  validators: BaseValidator[] = [];
  constructor(validator: TeamValidator) {
    if (validator.max_subs_in_other_leagues) {
      this.addValidator(
        new MaxSubsInOtherLeagues(validator.max_subs_in_other_leagues)
      );
    }
    if (validator.minimum_player_strength) {
      this.addValidator(
        new MinimumPlayerStrengthValidator(validator.minimum_player_strength)
      );
    }
    if (validator.maximum_player_strength) {
      this.addValidator(
        new MaximumPlayerStrengthValidator(validator.maximum_player_strength)
      );
    }
  }

  addValidator(validator: BaseValidator) {
    this.validators.push(validator);
  }

  validateAndUpdate(roster: Roster) {
    this.validators.forEach((currentValidator) => {
      if (!currentValidator.check(roster)) {
        return false;
      }
    });
    return true;
  }
}

export default Validator;
