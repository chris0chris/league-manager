import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Games from '../Games';
import {THREE_GAMES} from '../../../__tests__/testdata/gamesData';

const onClickMock = jest.fn();
const loadAllGamesMock = jest.fn();

const setup = () => {
  const initialState = {
    ...THREE_GAMES,
    onClick: onClickMock,
    loadAllGames: loadAllGamesMock,
  };
  const component = render(<Games {...initialState} />);
  return component;
};

describe('Games component', () => {
  it('should render component', () => {
    setup();
    expect(screen.getAllByRole('row').length).toBe(4);
  });
  it('should display no games to whistlye', () => {
    render(<Games games={[]} onClick={()=>{}} loadAllGames={() => {}} />);
    expect(screen.getByText('Keine Spiele zu pfeifen')).toBeInTheDocument();
  });
  it('should emit callback on click event', () => {
    setup();
    const firstRowButton = screen.getAllByRole('button')[0];
    userEvent.click(firstRowButton);
    expect(onClickMock.mock.calls.length).toBe(1);
    expect(onClickMock.mock.calls[0][0]).toBe(0);
  });
  it('should emit load all games, when clicked on checkbox', () => {
    setup();
    userEvent.click(screen.getByRole('checkbox'));
    expect(loadAllGamesMock.mock.calls[0][0]).toBeTruthy();
  });
});
