export type jsonTypePlayer = {
    key: number;
    playerid: string;
    name: string;
    lastname: string;
    trikotnumber: number;
    passnumber: string;
    sex: string;
    ownLeagueGamedaysPlayed: number;
    otherTeamGamedaysPlayed: number;
    checked: boolean;
  }[];

  export type jsonTypeTeam = {
    id: string;
    name: string;
    kickoff: string;
    field: number;
    checked: boolean;
  }[];

  export type apiTeam = {
    id: number;
    name: string;
  }

  export type apiTokens = {
    token_key: string;
    user_id: number;
  }

  export type apiGames = {
    id: number;
    field: number;
    scheduled: string;
    officials: number;
  }

  export type apiGamedays = {
    id: number;
    league_id: number;
    season_id: number;
    date: string;
  }

  export type apiUsernames = {
    id : number;
    username: string;
  }