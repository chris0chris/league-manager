
import React from 'react';
import {render, screen} from '@testing-library/react';
import Series from '../gameEvent/Series';

const mockFunc = jest.fn();

const setup = () => {
  mockFunc.mockClear();
  render(<Series update={mockFunc} />);
};

describe('Series component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', {name: 'Turnover'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: 'INT'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: '1st'})).toBeChecked();
  });
  it('should call update function', () => {
    setup();
    expect(mockFunc.mock.calls[mockFunc.mock.calls.length-1][0]).toEqual({
      event: [
        {name: 'First Down', player: ''},
      ],
    });
  });
});
