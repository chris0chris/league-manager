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