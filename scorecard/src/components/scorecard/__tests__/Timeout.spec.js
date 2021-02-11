/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Timeout from '../Timeout';

const mockFunc = jest.fn();

const setup = () => {
  render(<Timeout />);
};

describe('Touchdown component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByRole('heading', {name: 'Auszeit TeamName'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Fertig'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Abbrechen'})).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
  it('should disable timeout button and set correct time, when clicked on done', () => {
    setup();
    expect(screen.getByTestId('timeoutButton')).toBeEnabled();
    userEvent.click(screen.getByTestId('timeoutButton'));
    userEvent.type(screen.getByPlaceholderText('Minuten'), '00');
    userEvent.type(screen.getByPlaceholderText('Sekunden'), '01');
    userEvent.click(screen.getByRole('button', {name: 'Fertig'}));
    expect(screen.getByTestId('timeoutButton')).toBeDisabled();
    expect(screen.getByText('00:01')).toBeInTheDocument();
  });
  it('should do nothing, when clicked on done', () => {
    setup();
    expect(screen.getByTestId('timeoutButton')).toBeEnabled();
    userEvent.click(screen.getByTestId('timeoutButton'));
    userEvent.type(screen.getByPlaceholderText('Minuten'), '00');
    userEvent.type(screen.getByPlaceholderText('Sekunden'), '01');
    userEvent.click(screen.getByRole('button', {name: 'Abbrechen'}));
    expect(screen.getByTestId('timeoutButton')).toBeEnabled();
    expect(screen.queryByText('00:01')).not.toBeInTheDocument();
  });
});
