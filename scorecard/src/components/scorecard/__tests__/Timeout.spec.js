
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Timeout from '../Timeout';
import $ from 'jquery/src/jquery';
import { vi } from 'vitest';

const modalMock = vi.fn();
vi.mock('jquery/src/jquery', () => ({ default: vi.fn() }));
$.mockImplementation(() => {
  return {modal: modalMock};
});

const onSubmitMock = vi.fn();


const setup = () => {
  onSubmitMock.mockClear();
  render(<Timeout teamName="TeamName" modId="1" onSubmit={onSubmitMock} />);
};

describe('Timeout component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByTestId('timeoutButton')).toBeEnabled();
    expect(screen.queryByText('Auszeit TeamName')).toBeInTheDocument();
    expect(screen.queryByText('Fertig')).toBeInTheDocument();
    expect(screen.queryByText('Abbrechen')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
  it('should disable timeout button and set correct time, when clicked on done', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('timeoutButton'));
    await user.type(screen.getByPlaceholderText('Minuten'), '00');
    await user.type(screen.getByPlaceholderText('Sekunden'), '01');
    await user.click(screen.getByRole('button', {name: 'Fertig'}));
    expect(modalMock.mock.calls[0][0]).toBe('hide');
    expect(screen.getByTestId('timeoutButton')).toBeDisabled();
    expect(screen.getByText('0:1')).toBeInTheDocument();
    expect(onSubmitMock.mock.calls[0][0]).toEqual({
      team: 'TeamName',
      event: [
        {name: 'Auszeit', input: '0:1'},
      ],
    });
  });
  it('should do nothing, when clicked on done', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByTestId('timeoutButton')).toBeEnabled();
    await user.click(screen.getByTestId('timeoutButton'));
    await user.type(screen.getByPlaceholderText('Minuten'), '00');
    await user.type(screen.getByPlaceholderText('Sekunden'), '01');
    await user.click(screen.getByRole('button', {name: 'Abbrechen'}));
    expect(screen.getByTestId('timeoutButton')).toBeEnabled();
    expect(screen.queryByText('00:01')).not.toBeInTheDocument();
    expect(onSubmitMock.mock.calls).toHaveLength(0);
  });
});
