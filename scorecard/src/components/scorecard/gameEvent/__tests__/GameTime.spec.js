
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameTime from '../GameTime';
import { vi } from 'vitest';

const updateMock = vi.fn();


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

  it('should update event, when time is typed', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText('Minuten'), '0');
    await user.type(screen.getByPlaceholderText('Sekunden'), '1');
    expect(updateMock.mock.calls[2][0]).toEqual({
      event: [{name: 'Spielzeit', input: '0:1'}],
    });
  });
});
