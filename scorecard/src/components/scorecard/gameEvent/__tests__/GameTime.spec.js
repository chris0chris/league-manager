/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameTime from '../GameTime';

const updateMock = jest.fn();


const setup = () => {
  updateMock.mockClear();
  render(<GameTime update={updateMock} />);
};

describe('GameTime component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByPlaceholderText('Minuten')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sekunden')).toBeInTheDocument();
  });
  it('should update event, when time is inserted', () => {
    setup();
    userEvent.type(screen.getByPlaceholderText('Minuten'), '00');
    userEvent.type(screen.getByPlaceholderText('Sekunden'), '01');
    expect(updateMock.mock.calls[4][0]).toEqual({
      event: [{name: 'Spielzeit', input: '00:01'}],
    });
  });
});
