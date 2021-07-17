export const LIVETICKER_DATA = [
  {
    gameId: 1,
    status: '1. Halbzeit',
    time: '11:30',
    home: {
      name: 'Baltic Blue Stars Rostock',
      score: '12',
      isInPossession: true,
    },
    away: {
      name: 'Munich Mules',
      score: '0',
      isInPossession: false,
    },
    ticks: [
      {text: 'Turnover', team: 'home', time: '12:05'},
      {text: 'Touchdown: #19 Extra-Punkt: #7', team: 'home', time: '12:10'},
      {text: 'Auszeit - 12:00', team: 'away', time: '12:12'},
      {text: 'Safety: #12', team: 'home', time: '13:10'},
      {text: 'Touchdown: #7 Extra-Punkt: -', team: 'away', time: '13:20'},
    ],
  },
  {
    gameId: 2,
    status: '2. Halbzeit',
    time: '12:30',
    home: {
      name: 'Munich Mules',
      img: 'https://dffl.flag-coaching.info/dffl/wp-content/uploads/2018/03/Logo-Munich-Mules.png',
      score: '0',
      isInPossession: false,
    },
    away: {
      name: 'Team Deutschland',
      img: 'https://dffl.flag-coaching.info/dffl/wp-content/uploads/2018/02/TD-FlagFootball-Logo-Kopie.png',
      score: '12',
      isInPossession: true,
    },
    ticks: [
      {text: 'Turnover [12:00]', team: 'away', time: '13:00'},
      {text: 'Touchdown: #19 Extra-Punkt: #7', team: 'home', time: '13:05'},
      {text: 'Auszeit - 12:00', team: 'home', time: '13:30'},
      {text: 'Safety: #12', team: 'home', time: '13:31'},
      {text: 'Touchdown: #7 Extra-Punkt: -', team: 'away', time: '13:59'},
    ],
  },
];
