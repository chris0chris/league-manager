export const GAME_LOG_COMPLETE_GAME = {
  'gameId': 53,
  'isFirstHalf': false,
  'home': {
    'name': 'Home',
    'score': 42,
    'firsthalf': {
      'score': 21,
      'entries': [
        {
          'sequence': 3,
          'td': 19,
          'pat1': 7,
        },
        {
          'sequence': 2,
          'td': 19,
          'pat2': 7,
        },
        {
          'sequence': 1,
          'td': 19,
        },
      ],
    },
    'secondhalf': {
      'score': 21,
      'entries': [
        {
          'sequence': 9,
          'td': 19,
          'pat1': 7,
        },
        {
          'sequence': 8,
          'td': 19,
          'pat2': 7,
        },
        {
          'sequence': 5,
          'td': 19,
        },
      ],
    },
  },
  'away': {
    'name': 'Away',
    'score': 13,
    'firsthalf': {
      'score': 0,
      'entries': [],
    },
    'secondhalf': {
      'score': 3,
      'entries': [
        {
          'sequence': 11,
          'cop': true,
          'name': 'Turnover',
        },
        {
          'sequence': 10,
          'Safety': null,
          'isDeleted': true,
        },
        {
          'sequence': 7,
          'cop': true,
          'name': 'Turnover',
        },
        {
          'sequence': 6,
          'Safety': 7,
        },
        {
          'sequence': 4,
          'td': 7,
          'pat1': null,
        },
      ],
    },
  },
};
export const GAME_LOG_ONLY_FIRSTHALF = {
  'gameId': 52,
  'isFirstHalf': true,
  'home': {
    'name': 'Wesel',
    'score': 21,
    'firsthalf': {
      'score': 21,
      'entries': [
        {
          'sequence': 3,
          'td': 19,
          'pat1': 7,
        },
        {
          'sequence': 2,
          'td': 19,
          'pat2': 7,
        },
        {
          'sequence': 1,
          'td': 19,
        },
      ],
    },
    'secondhalf': {
      'score': 0,
      'entries': [],
    },
  },
  'away': {
    'name': 'Iser',
    'score': 3,
    'secondhalf': {
      'score': 0,
      'entries': [],
    },
    'firsthalf': {
      'score': 3,
      'entries': [
        {
          'sequence': 8,
          'cop': true,
          'name': 'Turnover',
        },
        {
          'sequence': 7,
          'Safety': null,
          'isDeleted': true,
        },
        {
          'sequence': 6,
          'cop': true,
          'name': 'Turnover',
        },
        {
          'sequence': 5,
          'Safety': 7,
        },
        {
          'sequence': 4,
          'td': 7,
          'pat1': null,
        },
      ],
    },
  },
};

