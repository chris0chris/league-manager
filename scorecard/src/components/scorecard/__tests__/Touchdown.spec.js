
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Touchdown from '../Touchdown';

const mockFunc = jest.fn();

const setup = () => {
  render(<Touchdown resetRequested={false} setResetRequested={()=>{}} update={mockFunc} />);
};

describe('Touchdown component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByPlaceholderText('Trikotnummer TD')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Trikotnummer PAT')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', {name: '1'})).toBeChecked();
  });

  it('should call update function with pat1', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    await user.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    expect(mockFunc.mock.calls[mockFunc.mock.calls.length-1][0]).toEqual({
      event: [
        {name: 'Touchdown', player: '19'},
        {name: '1-Extra-Punkt', player: '7'},
      ],
    });
  });

  it('should call update function with pat2', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    await user.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    await user.click(screen.getByRole('radio', {name: '2'}));
    expect(mockFunc.mock.calls[mockFunc.mock.calls.length-1][0]).toEqual({
      event: [
        {name: 'Touchdown', player: '19'},
        {name: '2-Extra-Punkte', player: '7'},
      ],
    });
  });
});
