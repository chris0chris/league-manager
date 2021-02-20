import {GET_GAMES} from '../../actions/types';
import gamesReducer from '../gamesReducer';

describe('Games Reducer', () => {
  it('Should return initial state', () => {
    const newState = gamesReducer(undefined, {});
    expect(newState).toEqual({
      games: [],
      gameSetupOfficials: [],
      gameSetup: {
        ctResult: '',
        direction: '',
        fhPossession: '',
      },
      gameLog: {
        'home': {
          'name': 'Heim',
          'score': -1,
          'firsthalf': {
            'score:': -1,
            'entries': [],
          },
          'secondhalf': {
            'score:': -1,
            'entries': [],
          },
        },
        'away': {
          'name': 'Gast',
          'score': -1,
          'firsthalf': {
            'score:': -1,
            'entries': [],
          },
          'secondhalf': {
            'score:': -1,
            'entries': [],
          },
        },
      },
    });
  });

  it('Should return new state if receiving type', () => {
    const games = {
      games: [
        {
          id: 1,
        },
      ],
    };
    const newState = gamesReducer(undefined, {
      type: GET_GAMES,
      payload: games.games,
    });
    expect(newState.games).toEqual(games.games);
  });
});
