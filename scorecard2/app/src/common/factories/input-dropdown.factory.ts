import { InputDropdownItem } from "../../types";
import { Official } from "../../types/gameSetup.types";

export class InputDropdownItemFactory {
  static createFromOfficial(official: Official): InputDropdownItem {
    return {
      id: official.id,
      text: `${official.first_name} ${official.last_name}`,
      subtext: official.team,
    };
  }
}
