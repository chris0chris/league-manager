/* eslint-disable max-len */
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
  it('should call update function with pat1', () => {
    setup();
    userEvent.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    userEvent.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    expect(mockFunc.mock.calls[mockFunc.mock.calls.length-1][0]).toEqual({'Touchdown': '19', '1-Extra-Punkt': '7'});
  });
  it('should call update function with pat2', () => {
    setup();
    userEvent.type(screen.getByRole('spinbutton', {name: 'touchdown number'}), '19');
    userEvent.type(screen.getByRole('spinbutton', {name: 'PAT number'}), '7');
    userEvent.click(screen.getByRole('radio', {name: '2'}));
    expect(mockFunc.mock.calls[mockFunc.mock.calls.length-1][0]).toEqual({'Touchdown': '19', '2-Extra-Punkte': '7'});
  });
});
