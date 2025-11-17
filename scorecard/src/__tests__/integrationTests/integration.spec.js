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

  test.skip('Store is updated correctly', async () => {
    const expectedState = {
      data: {
        date: '2020-07-12',
        name: 'Test Gameday',
      },
    };
    const store = testStore();

    store.dispatch(getGamedays());

    await moxios.wait(() => {
      const request = moxios.requests.mostRecent();
      return request.respondWith({
        status: 200,
        response: expectedState,
      });
    });

    const newState = store.getState();
    expect(newState.gamedays).toBe(expectedState.data);
  });
});
