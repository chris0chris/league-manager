export type ScorecardOfficialPosition = {
  position_name: string;
  is_optional: boolean;
};

export type ScorecardCategoryValues = {
  id: number;
  value: string;
};

export type ScorecardCategory = {
  id: number;
  name: string;
  team_option: "home" | "away" | "none";
  is_required: boolean;
  values: ScorecardCategoryValues[];
};

export type Official = {
  team: string;
  last_name: string;
  first_name: string;
  id: number;
};

export type SelectedOfficial = {
  position: string;
  name: string;
  id: number | null;
};

export type SelectedCategory = {
  id: number;
  // name: string;
  valueId: number;
};

export type ScorecardConfig = {
  officials: ScorecardOfficialPosition[];
  categories: ScorecardCategory[];
};

export type GameInfo = {
  scheduled: string;
  field: number;
  stage: string;
  standing: string;
  home: string;
  away: string;
};

export type GameSetup = {
  scorecard: ScorecardConfig;
  teamOfficials: Official[];
  gameInfo: GameInfo;
};
