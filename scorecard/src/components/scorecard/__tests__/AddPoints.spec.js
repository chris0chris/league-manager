/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import AddPoints from '../AddPoints';
import userEvent from '@testing-library/user-event';

const mockFunc = jest.fn();
const setup = () => {
  mockFunc.mockClear();
  render(<AddPoints onSubmit={mockFunc} />);
};

describe('AddPoints component', () => {
  it('should render correct', () => {
    setup();
    const seriesButton = screen.getByRole('radio', {name: 'Serie'});
    expect(seriesButton).toBeInTheDocument();
    expect(seriesButton).toBeChecked();
    expect(screen.getByRole('radio', {name: 'Touchdown'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: 'Mehr...'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Eintrag speichern'})).toBeInTheDocument();
  });
  it('should display different input field, when selecting another button', () => {
    setup();
    userEvent.click(screen.getByRole('radio', {name: 'Touchdown'}));
    userEvent.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    userEvent.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    userEvent.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
  });
  it('should call callback, when input is submitted', () => {
    setup();
    userEvent.click(screen.getByRole('radio', {name: 'Serie'}));
    expect(screen.getByPlaceholderText('First Down - Nummer optional')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(screen.getByRole('radio', {name: 'Serie'})).toBeChecked();
    expect(mockFunc.mock.calls).toHaveLength(1);
  });
});
