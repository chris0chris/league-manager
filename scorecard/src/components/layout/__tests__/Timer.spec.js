import React from 'react';
import {render, screen, act} from '@testing-library/react';
import Timer from '../Timer';

const setup = () => {
  render(<Timer isOn={true} durationInSeconds={10} />);
};

describe('FloatingInput component', () => {
  it('should render component', () => {
    jest.useFakeTimers();
    setup();
    expect(screen.getByText('10')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
