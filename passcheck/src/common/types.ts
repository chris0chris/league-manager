export type GameOverviewInfo = {
  officialsTeamName: string;
  games: Game[];
  gamedays: Gameday[];
};

export type Gameday = {
  id: number;
  name: string;
};

export type Roster = Player[];

export type TeamData = {
  team: Team;
  additionalTeams: Team[];
  official_name: string;
  note: string | null;
};

export type Team = {
  name: string;
  roster: Roster;
  validator: TeamValidator;
};

export type AdditionalTeams = Team[];

export type TeamValidator = {
  max_subs_in_other_leagues?: number;
  minimum_player_strength?: number;
  maximum_player_strength?: number | null;
  jerseyNumberBetween?: {
    min: number;
    max: number;
  };
};

export type Player = {
  jersey_number: number;
  id: number;
  first_name: string;
  last_name: string;
  pass_number: number;
  isSelected: boolean;
  validationError?: string;
};

export type jsonTypeTeam = {
  id: string;
  name: string;
  kickoff: string;
  field: number;
  checked: boolean;
}[];

export type Game = {
  gameday_id: number;
  field: number;
  scheduled: string;
  away: apiTeam;
  home: apiTeam;
};

export type GameList = Game[];

export type apiTeam = {
  id: number;
  name: string;
  isChecked: boolean;
};

export type apiTokens = {
  token_key: string;
  user_id: number;
};

export type apiGames = {
  officialsTeamName: string;
  games: [
    {
      id: number;
      field: number;
      scheduled: string;
      officials: number;
      gameday: number;
      away: string;
      home: string;
    }
  ];
};

export type apiGamedays = {
  id: number;
  league_id: number;
  season_id: number;
  date: string;
};

export type apiUsernames = {
  id: number;
  username: string;
};

export type PasscheckVerification = {
  teamId: string;
  gamedayId: string;
  data: {
    official_name: string;
    note: string | null;
    roster: Player[];
  };
};
