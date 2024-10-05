export type GamedaysOverview = {
  officiatingTeamId: number;
  gamedays: Gameday[];
};

export type Gameday = {
  id: number;
  name: string;
  date: string;
  games: Game[];
};

export type Game = {
  id: number;
  field: number;
  scheduled: string;
  isFinished: boolean;
  officialsId: number;
  officials: string;
  home: string;
  away: string;
};

export type SelectedGame = {
  isSelected: boolean;
  gameId: number;
};

export type InputDropdownItem = {
  id: number;
  text: string;
  subtext: string;
};
