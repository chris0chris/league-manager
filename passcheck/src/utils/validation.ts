import {Player, Roster, TeamValidator} from '../common/types';
import {Message, MessageColor} from '../context/MessageContext';

abstract class BaseValidator {
  check(roster: Roster, player: Player | null = null): boolean {
    if (!this.isValid(roster, player)) {
      return false;
    }
    if (this.nextValidator) {
      return this.nextValidator.check(roster);
    }
    return true;
  }
  abstract isValid(roster: Roster, player: Player | null): boolean;
  abstract getValidationError(): string;
  getMessageColor(): MessageColor {
    return MessageColor.Danger;
  }

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

class JerseyNumberBetweenValidator extends BaseValidator {
  minimumNumber: number;
  maximumNumber: number;
  constructor(minimumNumber: number, maximumNumber: number) {
    super();
    this.minimumNumber = minimumNumber;
    this.maximumNumber = maximumNumber;
  }
  isValid(roster: Roster, player: Player | null): boolean {
    if (!player) {
      return false;
    }
    return (
      player.jersey_number >= this.minimumNumber &&
      player.jersey_number <= this.maximumNumber
    );
  }
  getValidationError(): string {
    return `Trikotnummer muss eine Zahl zwischen ${this.minimumNumber} und ${this.maximumNumber} sein.`;
  }
}

class UniqueJerseyNumber extends BaseValidator {
  constructor() {
    super();
  }
  isValid(roster: Roster, player: Player | null): boolean {
    if (!player) {
      return false;
    }
    let allJerseryNumbers: number[] = [];
    let isValid = true;
    roster.forEach((currentPlayer) => {
      if (currentPlayer.id !== player.id) {
        allJerseryNumbers = [...allJerseryNumbers, currentPlayer.jersey_number];
        if (allJerseryNumbers.includes(player?.jersey_number)) {
          isValid = false;
        }
      }
    });
    return isValid;
  }
  getValidationError(): string {
    return 'Trikotnummer ist bereits in Verwendung und darf nur einmal vorkommen.';
  }
}

class MinimumPlayerStrengthValidator extends BaseValidator {
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

class MaximumPlayerStrengthValidator extends BaseValidator {
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
  getMessageColor(): MessageColor {
    return MessageColor.Warning;
  }
}

class Validator {
  validators: BaseValidator[] = [];
  roster: Roster;
  constructor(validator: TeamValidator, roster: Roster) {
    this.roster = roster;
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
    if (validator.jerseyNumberBetween) {
      this.addValidator(
        new JerseyNumberBetweenValidator(
          validator.jerseyNumberBetween.min,
          validator.jerseyNumberBetween.max
        )
      );
      this.addValidator(new UniqueJerseyNumber());
    }
  }

  addValidator(validator: BaseValidator) {
    this.validators.push(validator);
  }

  validateAndUpdate(setMessage: ((message: Message) => void) | null = null) {
    let isValid = true;
    this.validators.forEach((currentValidator) => {
      if (!currentValidator.check(this.roster)) {
        isValid = false;
        if (setMessage) {
          setMessage({
            text: currentValidator.getValidationError(),
            color: currentValidator.getMessageColor(),
          });
        }
        return;
      }
    });
    if (isValid && setMessage) {
      setMessage({text: ''});
    }
    return isValid;
  }
  validateAndGetErrors(player: Player): string[] {
    console.log('first');
    let errors: string[] = [];
    this.validators.forEach((currentValidator) => {
      if (!currentValidator.check(this.roster, player)) {
        errors = [...errors, currentValidator.getValidationError()];
      }
    });
    return errors;
  }
}

export default Validator;
