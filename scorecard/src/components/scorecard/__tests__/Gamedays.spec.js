import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Gamedays from '../Gamedays';
import {ONE_GAMEDAY} from '../../../__tests__/testdata/gamedaysData';

const mockFunc = jest.fn();

const setup = () => {
  const initialState = {
    ...ONE_GAMEDAY,
    onClick: mockFunc,
  };
  render(<Gamedays {...initialState} />);
};

describe('Gamedays component', () => {
  it('should render component', () => {
    setup();
    expect(screen.getAllByRole('row').length).toBe(2);
  });

  it('should emit callback on click event', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button'));
    expect(mockFunc.mock.calls.length).toBe(1);
    expect(mockFunc.mock.calls[0][0]).toBe(1);
  });
});
