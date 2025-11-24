import {vi} from 'vitest';
import axios from 'axios';
import {testStore} from '../Utils';
import {getGamedays} from '../../actions/gamedays';

vi.mock('axios');

describe('getGames action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Store is updated correctly', async () => {
    const expectedData = {
      date: '2020-07-12',
      name: 'Test Gameday',
    };

    // Mock axios.get to return the expected data
    // apiGet extracts res.data, which becomes the payload
    axios.get.mockResolvedValue({
      data: expectedData,
    });

    const store = testStore();

    // Dispatch the action and wait for it to complete
    await store.dispatch(getGamedays());

    // Check that axios.get was called with the correct URL
    expect(axios.get).toHaveBeenCalledWith(
      '/api/gameday/list',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );

    // Check the store state was updated correctly
    const newState = store.getState();
    expect(newState.gamedaysReducer.gamedays).toEqual(expectedData);
  });
});
