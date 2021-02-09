/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
// import {GAME_LOG_COMPLETE_GAME} from '../../../__tests__/testdata/gameLogData';
import AddPoints from '../AddPoints';
import userEvent from '@testing-library/user-event';

const setup = () => {
  render(<AddPoints />);
};

describe('AddPoints component', () => {
  it('should render correct', () => {
    setup();
    const touchdownButton = screen.getByRole('radio', {name: new RegExp('Touchdown')});
    expect(touchdownButton).toBeInTheDocument();
    expect(touchdownButton).toBeChecked();
    expect(screen.getByRole('radio', {name: new RegExp('Spezial')})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: new RegExp('Defense')})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: new RegExp('Eintrag speichern')})).toBeInTheDocument();
  });
  it('should display different input field, when selecting another button', () => {
    setup();
    userEvent.click(screen.getByRole('radio', {name: new RegExp('Spezial')}));
    // expect(screen.getByPlaceholderText('')).toBeInTheDocument();
  });
});
