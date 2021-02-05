export const GAME_PAIR_1 = {
  scheduled: '10:00:00',
  field: 1,
  officials: 'Rheda',
  stage: 'Vorrunde',
  standing: 'Gruppe 1',
  home: 'Bulldogs',
  points_home: 16,
  points_away: 25,
  away: 'Spatzen',
  status: 'gestartet',
  id_home: 61,
  id_away: 62,
  id: 52,
};
const GAME_PAIR_2 = {
  scheduled: '11:10:00',
  field: 1,
  officials: ' Pandas',
  stage: 'Vorrunde',
  standing: 'Gruppe 1',
  home: 'Wesel',
  points_home: 25,
  points_away: 52,
  away: 'Iser',
  status: '',
  id_home: 63,
  id_away: 64,
  id: 53,
};

const GAME_PAIR_3 = {
  scheduled: '10:00:00',
  field: 2,
  officials: ' Wesel',
  stage: 'Vorrunde',
  standing: 'Gruppe 2',
  home: 'Dort',
  points_home: 33,
  points_away: 24,
  away: 'Pandas',
  status: '',
  id_home: 67,
  id_away: 68,
  id: 55,
};

export const ONE_GAME = {
  games: [GAME_PAIR_1],
};

export const TWO_GAMES = {
  games: [GAME_PAIR_1, GAME_PAIR_2],
};
export const THREE_GAMES = {
  games: [GAME_PAIR_1, GAME_PAIR_2, GAME_PAIR_3],
};
