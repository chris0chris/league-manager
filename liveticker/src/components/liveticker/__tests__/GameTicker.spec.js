/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import {LIVETICKER_DATA} from '../../../__tests__/testdata/livetickerData';
import GameTicker from '../GameTicker';

const GAME_TICKER_DATA = LIVETICKER_DATA[0];
const setup = () => {
  render(<GameTicker {...GAME_TICKER_DATA} />);
};

describe('GameTicker component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.status))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.time))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.home.name))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.away.name))).toBeInTheDocument();
  });
});
