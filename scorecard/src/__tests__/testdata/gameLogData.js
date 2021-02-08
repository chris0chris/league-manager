export const GAME_LOG_COMPLETE_GAME = {
  'gameId': 52,
  'isFirstHalf': false,
  'home': {
    'name': 'Home',
    'score': 42,
    'firsthalf': {
      'score': 21,
      'entries': [
        {
          'sequence': 1,
          'td': 19,
        },
        {
          'sequence': 2,
          'td': 19,
          'pat2': 7,
        },
        {
          'sequence': 3,
          'td': 19,
          'pat1': 7,
        },
      ],
    },
    'secondhalf': {
      'score': 21,
      'entries': [
        {
          'sequence': 5,
          'td': 19,
        },
        {
          'sequence': 8,
          'td': 19,
          'pat2': 7,
        },
        {
          'sequence': 9,
          'td': 19,
          'pat1': 7,
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
          'sequence': 4,
          'td': 7,
          'pat1': null,
        },
        {
          'sequence': 6,
          'Safety': 7,
        },
        {
          'sequence': 7,
          'cop': true,
        },
        {
          'sequence': 10,
          'Safety': null,
        },
        {
          'sequence': 11,
          'cop': true,
        },
      ],
    },
  },
};
export const GAME_LOG_ONLY_FIRSTHALF = {
  'gameId': 52,
  'isFirstHalf': false,
  'home': {
    'name': 'Home',
    'score': 42,
    'firsthalf': {
      'score': 21,
      'entries': [
        {
          'sequence': 1,
          'td': 19,
        },
        {
          'sequence': 2,
          'td': 19,
          'pat2': 7,
        },
        {
          'sequence': 3,
          'td': 19,
          'pat1': 7,
        },
      ],
    },
    'secondhalf': {
      'score': 0,
      'entries': [],
    },
  },
  'away': {
    'name': 'Away',
    'score': 13,
    'secondhalf': {
      'score': 0,
      'entries': [],
    },
    'firsthalf': {
      'score': 3,
      'entries': [
        {
          'sequence': 4,
          'td': 7,
          'pat1': null,
        },
        {
          'sequence': 5,
          'Safety': 7,
        },
        {
          'sequence': 6,
          'cop': true,
        },
        {
          'sequence': 7,
          'Safety': null,
        },
        {
          'sequence': 11,
          'cop': true,
        },
      ],
    },
  },
};

