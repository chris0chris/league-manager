/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
// import {GAME_LOG_COMPLETE_GAME} from '../../../__tests__/testdata/gameLogData';
import AddPoints from '../AddPoints';
import userEvent from '@testing-library/user-event';

const mockFunc = jest.fn();
const setup = () => {
  render(<AddPoints onSubmit={mockFunc} />);
};

describe('AddPoints component', () => {
  it('should render correct', () => {
    setup();
    const touchdownButton = screen.getByRole('radio', {name: new RegExp('Touchdown')});
    expect(touchdownButton).toBeInTheDocument();
    expect(touchdownButton).toBeChecked();
    expect(screen.getByRole('radio', {name: 'Safety'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: 'Turnover'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Eintrag speichern'})).toBeInTheDocument();
  });
  it('should display different input field, when selecting another button', () => {
    setup();
    userEvent.click(screen.getByRole('radio', {name: new RegExp('Safety')}));
    expect(screen.getByPlaceholderText('Trikotnummer')).toBeInTheDocument();
  });
  it('should call callback, when input is submitted', () => {
    setup();
    userEvent.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    userEvent.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    userEvent.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(mockFunc.mock.calls).toHaveLength(1);
  });
});
