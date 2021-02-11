/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Halftime from '../Halftime';

const mockFunc = jest.fn();

const setup = () => {
  render(<Halftime />);
};

describe('Touchdown component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.getByRole('button', {name: 'Halbzeit'})).toBeInTheDocument();
  });
});
