import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RadioButton from '../RadioButton';
import { vi } from 'vitest';

const mockFunk = vi.fn();

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

  it('should propagate the correct implicit value', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText('textFirstButton'));
    expect(mockFunk.mock.calls[0][0]).toBe('textFirstButton');
  });
  it('should propagate the correct explicit value', async () => {
    const user = userEvent.setup();
    setup('someValue');
    await user.click(screen.getByText('textFirstButton'));
    expect(mockFunk.mock.calls[0][0]).toBe('someValue');
  });
});
