export type jsonTypePlayerlist = {
  first_name: string;
  gamedays: number[];
  id: string;
  key: number;
  last_name: string;
  pass_number: string;
  sex: string;
  team: number;
  jersey_number: number;
  ownLeagueGamedaysPlayed: number;
  otherTeamGamedaysPlayed: number;
}[];

export type jsonTypeTeam = {
  id: string;
  name: string;
  kickoff: string;
  field: number;
  checked: boolean;
}[];

export type jsonTypeGames = {
  id: number;
  field: number;
  scheduled: string;
  officials: number;
  gameday: number;
  away: apiTeam;
  home: apiTeam;
}[];

export type apiTeam = {
  id: number;
  name: string;
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
