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
        {name: 'illegaler Kontakt Offense', subtext: 'BS/LoD 10'},
        {name: 'Offense Pass Behinderung', subtext: 'BS/LoD 10'},
        {name: 'Fehlstart', subtext: 'DB/5'},
        {name: 'Defense Offside', subtext: 'DB/5'},
        {name: 'illegale Ballübergabe', subtext: 'SF/LoD 5'},
        {name: 'illegale Ballübergabe', subtext: 'SF/LoD 5'},
        {name: 'illegale Ballübergabe', subtext: 'SF/LoD 5'},
        {name: 'illegale Ballübergabe', subtext: 'SF/LoD 5'},
        {name: 'illegale Ballübergabe', subtext: 'SF/LoD 5'},
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
  it('should update event, when time is inserted', () => {
    setup();
    userEvent.type(screen.getByPlaceholderText('Trikotnummer'), '42');
    userEvent.type(screen.getByPlaceholderText('Strafe eingeben und auswählen...'), 'ik');
    userEvent.click(screen.getByText('illegaler Kontakt Offense'));
    const illegalContactText = screen.getByRole('textbox');
    expect(illegalContactText).toBeInTheDocument();
    const lastMockCall = updateMock.mock.calls.length - 1;
    expect(updateMock.mock.calls[lastMockCall][0]).toEqual({
      event: [{name: 'Strafe', player: '42', input: 'illegaler Kontakt Offense'}],
    });
  });
});
