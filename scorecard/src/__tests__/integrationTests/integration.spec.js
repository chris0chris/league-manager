import moxios from 'moxios';
import {testStore} from '../Utils';
import {getGamedays} from '../../actions/gamedays';

describe('getGames action', () => {
  beforeEach(() => {
    moxios.install();
  });

  afterEach(() => {
    moxios.uninstall();
  });

  /*eslint jest/no-done-callback: 1*/
  test('Store is updated correctly', (done) => {
    const expectedState = {
      data: {
        date: '2020-07-12',
        name: 'Test Gameday',
      },
    };
    const store = testStore();

    moxios.wait(() => {
      moxios.requests.mostRecent({
        status: 200,
        response: expectedState,
      });
      done();
    });

    store.dispatch(getGamedays()).then(() => {
      const newState = store.getState();
      expect(newState.gamedays).toBe(expectedState.data);
    });
  });
});
