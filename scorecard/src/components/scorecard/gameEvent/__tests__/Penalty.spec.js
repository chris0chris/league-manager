/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Penalty from '../Penalty';
import {testStore} from '../../../../__tests__/Utils';

const updateMock = jest.fn();


const setup = () => {
  updateMock.mockClear();
  const initialState = {
    configReducer: {
      penalties: [
        {'name': 'illegaler Kontakt Defense', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': true},
        {'name': 'Offense Pass Behinderung', 'subtext': 'BS/LoD 10', 'isPenaltyAgainstOpponent': false},
        {'name': 'Fehlstart', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': false},
        {'name': 'Defense Offside', 'subtext': 'DB/5', 'isPenaltyAgainstOpponent': true},
        {'name': 'illegale Ballübergabe', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': false},
        {'name': 'illegale Ballübergabe', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': false},
        {'name': 'illegale Ballübergabe', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': false},
        {'name': 'illegale Ballübergabe', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': false},
        {'name': 'illegale Ballübergabe', 'subtext': 'SF/LoD 5', 'isPenaltyAgainstOpponent': false},
        {
          name: 'ill/fehl obligatorisches Equipment, nicht verlassen Spielfeld',
          subtext: 'DB/TO',
        },
      ],
    },
  };
  const store = testStore(initialState);
  render(<Penalty store={store} update={updateMock} />);
};

describe('Penalty component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByPlaceholderText('Trikotnummer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Strafe eingeben und auswählen...')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('should update event, when time is inserted', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText('Trikotnummer'), '42');
    await user.type(screen.getByPlaceholderText('Strafe eingeben und auswählen...'), 'ik');
    await user.click(screen.getByText('illegaler Kontakt Defense'));
    const illegalContactText = screen.getByRole('textbox');
    expect(illegalContactText).toBeInTheDocument();
    const lastMockCall = updateMock.mock.calls.length - 1;
    expect(updateMock.mock.calls[lastMockCall][0]).toEqual({
      event: [{name: 'Strafe', player: '42', input: 'illegaler Kontakt Defense'}],
    });
    expect(updateMock.mock.calls[lastMockCall][1]).toEqual(true);
  });
});
