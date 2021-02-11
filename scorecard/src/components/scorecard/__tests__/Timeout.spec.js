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
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
