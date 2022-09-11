/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Safety from '../Safety';

const mockFunc = jest.fn();

const setup = () => {
  render(<Safety resetRequested={false} setResetRequested={()=>{}} update={mockFunc} />);
};

describe('Touchdown component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByPlaceholderText('Trikotnummer')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', {name: '2'})).toBeChecked();
  });
  it('should call update function with +1', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('spinbutton', {name: 'number'}), '19');
    await user.click(screen.getByRole('radio', {name: '1'}));
    expect(mockFunc.mock.calls[mockFunc.mock.calls.length-1][0]).toEqual({
      event: [
        {name: 'Safety (+1)', player: '19'}]});
  });
  it('should call update function with +2', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('spinbutton', {name: 'number'}), '19');
    expect(mockFunc.mock.calls[mockFunc.mock.calls.length-1][0]).toEqual({event: [
      {name: 'Safety (+2)', player: '19'}]});
  });
});
