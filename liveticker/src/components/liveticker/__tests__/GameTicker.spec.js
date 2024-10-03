/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import {LIVETICKER_DATA} from '../../../__tests__/testdata/livetickerData';
import GameTicker from '../GameTicker';
import userEvent from '@testing-library/user-event';


const GAME_TICKER_DATA = LIVETICKER_DATA[0];
const mockFunc = jest.fn();
const setup = () => {
  render(<GameTicker {...GAME_TICKER_DATA} gameIndex={0} updateGamesToDisplay={mockFunc} />);
};

describe('GameTicker component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.status))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.standing))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.home.name))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(GAME_TICKER_DATA.away.name))).toBeInTheDocument();
    expect(screen.getByTitle('Team hat Ballbesitz')).toBeInTheDocument();
    expect(screen.getByTitle('Klicken, um alle Einträge anzuzeigen')).toBeInTheDocument();
  });
  it('should call updateGamesToDisplay, when clicked on icon', async () => {
    const user = userEvent.setup();
    setup();
    mockFunc.mockClear();
    await user.click(screen.getByTitle('Klicken, um alle Einträge anzuzeigen'));
    expect(mockFunc.mock.calls).toHaveLength(1);
  });
});
