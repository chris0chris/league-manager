export type jsonTypePlayer = {
    key: number;
    playerid: string;
    name: string;
    lastname: string;
    shirtnumber: number;
    passnumber: string;
    sex: string;
    checked: boolean;
  }[];

  export type jsonTypeTeam = {
    id: string;
    name: string;
    kickoff: string;
    field: number;
    checked: boolean;
  }[];