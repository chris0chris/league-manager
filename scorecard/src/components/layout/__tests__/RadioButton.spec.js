import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RadioButton from '../RadioButton';

const mockFunk = jest.fn();

const setup = (value = undefined) => {
  mockFunk.mockClear();
  const firstButton = {
    id: 'idFirstButton',
    name: 'groupName',
    onChange: mockFunk,
    text: 'textFirstButton',
    value: value,
  };
  const secondButton = {
    id: 'idSecondButton',
    name: 'groupName',
    onChange: mockFunk,
    text: 'textSecondButton',
    value: value,
    checked: true,
  };
  render(
      <>
        <RadioButton {...firstButton} />
        <RadioButton {...secondButton} />
      </>,
  );
};

describe('RadioButtons component', () => {
  it('should render component', () => {
    setup();
    const allButtons = screen.getAllByRole('radio');
    expect(allButtons.length).toBe(2);

    const firstButton = allButtons[0];
    expect(firstButton).not.toBeChecked();
    expect(firstButton).toBeValid();
    expect(screen.getByLabelText('textFirstButton')).toBeInTheDocument();

    const secondButton = allButtons[1];
    expect(secondButton).toBeChecked();
    expect(secondButton).toBeValid();
    expect(screen.getByLabelText('textSecondButton')).toBeInTheDocument();
  });

  it('should propagate the correct implicit value', () => {
    setup();
    userEvent.click(screen.getByText('textFirstButton'));
    expect(mockFunk.mock.calls[0][0]).toBe('textFirstButton');
  });
  it('should propagate the correct explicit value', () => {
    setup('someValue');
    userEvent.click(screen.getByText('textFirstButton'));
    expect(mockFunk.mock.calls[0][0]).toBe('someValue');
  });
});
