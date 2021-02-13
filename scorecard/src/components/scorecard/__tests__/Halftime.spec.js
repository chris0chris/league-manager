/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Halftime from '../Halftime';
import {GAME_LOG_ONLY_FIRSTHALF} from '../../../__tests__/testdata/gameLogData';
import $ from 'jquery/src/jquery';

const submitMock = jest.fn();
const modalMock = jest.fn();
jest.mock('jquery/src/jquery', () => jest.fn());
$.mockImplementation(() => {
  return {modal: modalMock};
});

const setup = (half = 1) => {
  modalMock.mockClear();
  submitMock.mockClear();
  render(<Halftime gameLog={GAME_LOG_ONLY_FIRSTHALF} half={half} onSubmit={submitMock}/>);
};

describe('Halftime component', () => {
  it('should render correct halftime', () => {
    setup();
    expect(screen.getAllByTestId('timeoutButton')).toHaveLength(4);
    expect(screen.getByRole('button', {name: 'Halbzeit'})).toBeInTheDocument();
  });
  it('should render correct final', () => {
    setup(2);
    expect(screen.getAllByTestId('timeoutButton')).toHaveLength(4);
    expect(screen.getByRole('button', {name: 'Ende'})).toBeInTheDocument();
  });
  it('should set half, when halftime button and done is clicked', () => {
    setup();
    userEvent.click(screen.getByRole('button', {name: 'Halbzeit'}));
    userEvent.click(screen.getByTestId('halftime-done'));
    expect(submitMock.mock.calls[0][0]).toBe(2);
  });
  it('should do nothing, when halftime button and cancel is clicked', () => {
    setup();
    userEvent.click(screen.getByRole('button', {name: 'Halbzeit'}));
    userEvent.click(screen.getByTestId('halftime-cancel'));
    expect(submitMock.mock.calls).toHaveLength(0);
  });
});
