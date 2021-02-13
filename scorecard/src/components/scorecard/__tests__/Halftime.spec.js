/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import Halftime from '../Halftime';
import {GAME_LOG_ONLY_FIRSTHALF} from '../../../__tests__/testdata/gameLogData';
import $ from 'jquery/src/jquery';

const modalMock = jest.fn();
jest.mock('jquery/src/jquery', () => jest.fn());
$.mockImplementation(() => {
  return {modal: modalMock};
});

const setup = () => {
  render(<Halftime gameLog={GAME_LOG_ONLY_FIRSTHALF}/>);
};

describe('Touchdown component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByTestId('timeoutButton')).toHaveLength(4);
    expect(screen.getByRole('button', {name: 'Halbzeit'})).toBeInTheDocument();
  });
});
