/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Penalty from '../Penalty';

const updateMock = jest.fn();


const setup = () => {
  updateMock.mockClear();
  render(<Penalty update={updateMock} />);
};

describe('Penalty component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByPlaceholderText('Trikotnummer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ausgewählte Strafe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Strafe eingeben und auswählen...')).toBeInTheDocument();
  });
  it('should update event, when time is inserted', () => {
    setup();
    userEvent.type(screen.getByPlaceholderText('Trikotnummer'), '42');
    userEvent.type(screen.getByPlaceholderText('Strafe eingeben und auswählen...'), 'ik');
    userEvent.click(screen.getByText('illegaler Kontakt'));
    const lastMockCall = updateMock.mock.calls.length - 1;
    expect(updateMock.mock.calls[lastMockCall][0]).toEqual({
      event: [{name: 'Strafe', player: '42', input: 'illegaler Kontakt'}],
    });
  });
});
