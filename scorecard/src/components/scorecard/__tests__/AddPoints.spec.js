
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
    const touchdownButton = screen.getByRole('radio', {name: 'Serie'});
    expect(touchdownButton).toBeInTheDocument();
    expect(touchdownButton).toBeChecked();
    expect(screen.getByRole('radio', {name: 'Touchdown'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: 'Mehr...'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Eintrag speichern'})).toBeInTheDocument();
  });
  it('should display different input field, when selecting another button', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('radio', {name: 'Serie'}));
    await user.type(screen.getByRole('spinbutton', {name: 'number'}), '19');
    await user.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
  });
  it('should call callback, when input is submitted', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('radio', {name: 'Serie'}));
    expect(screen.getByPlaceholderText('First Down - Nummer optional')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Eintrag speichern'}));
    expect(screen.getByRole('radio', {name: 'Serie'})).toBeChecked();
    expect(mockFunc.mock.calls).toHaveLength(1);
  });
});
