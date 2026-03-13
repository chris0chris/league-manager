import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InputDropdown from '../InputDropdown';
import { vi } from 'vitest';

const updateMock = vi.fn();


const setup = (initText = {}) => {
  updateMock.mockClear();
  const initialState = {
    id: 'someInputDropdownId',
    setSelectedIndex: updateMock,
    placeholderText: 'inputDropdownPlaceholderText',
    initValues: initText,
    items: [
      {text: 'first_name first_last_name',
        subtext: 'some team',
        id: 1},
      {text: 'second_name second_last_name',
        subtext: 'some team',
        id: 2},
      {text: 'third_name third_last_name',
        subtext: 'some team',
        id: 3},
    ],
  };
  render(<InputDropdown {...initialState} />);
};

describe('InputDropdown component', () => {
  it('should render component', () => {
    setup();
    const inputElement =
      screen.getByPlaceholderText('inputDropdownPlaceholderText');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toBeEnabled();
    expect(screen.getAllByText(/name/i)).toHaveLength(3);
    expect(screen.getByTestId('searchButton')).toBeInTheDocument();
    expect(updateMock.mock.calls).toHaveLength(0);
  });

  it('should write text in input with delete button', () => {
    setup({text: 'some text', id: 1});
    const inputElement =
      screen.getByPlaceholderText('inputDropdownPlaceholderText');
    expect(inputElement).toHaveAttribute('readonly');
    expect(inputElement).toHaveValue('some text');
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(updateMock.mock.calls[0][0]).
        toEqual({text: 'some text', id: 1});
    expect(updateMock.mock.calls).toHaveLength(1);
  });

  it('should write text in input without delete button', () => {
    setup({text: 'different text', id: null});
    const inputElement =
      screen.getByPlaceholderText('inputDropdownPlaceholderText');
    expect(inputElement).not.toHaveAttribute('readonly');
    expect(inputElement).toHaveValue('different text');
    expect(screen.getByTestId('searchButton')).toBeInTheDocument();
    expect(updateMock.mock.calls[0][0]).
        toEqual({text: 'different text', id: null});
    expect(updateMock.mock.calls).toHaveLength(1);
  });
  it('should select item and show delete button', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText(/third_name/i));
    expect(screen.getByDisplayValue('third_name third_last_name'))
        .toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  it('should call parent method when item selected', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText(/third_name/i));
    expect(updateMock.mock.calls[0][0]).
        toEqual({text: 'third_name third_last_name', id: 3});
    expect(updateMock.mock.calls).toHaveLength(1);
  });
});
