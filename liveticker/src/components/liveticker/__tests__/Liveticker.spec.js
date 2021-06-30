/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import {LIVETICKER_DATA} from '../../../__tests__/testdata/livetickerData';
import {testStore} from '../../../__tests__/Utils';
import Liveticker from '../Liveticker';
import {apiGet} from '../../../actions/utils/api';


jest.mock('../../../actions/utils/api');
apiGet.mockImplementation(() => {
  return () => {};
});

const setup = () => {
  const initialState = {
    livetickerReducer: {
      liveticker: LIVETICKER_DATA,
    },
  };
  const store = testStore(initialState);
  render(<Liveticker store={store} />);
};

describe('Liveticker component', () => {
  it('should render correct', () => {
    setup();
    const GAME_TICKER_DATA = LIVETICKER_DATA[0];
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.status))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.home.name))).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(GAME_TICKER_DATA.away.name))).toHaveLength(2);
  });
});
