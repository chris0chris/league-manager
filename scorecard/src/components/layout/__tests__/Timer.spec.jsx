import React, {act} from 'react';

import {render, screen} from '@testing-library/react';
import Timer from '../Timer';
import { vi } from 'vitest';

const setup = () => {
  render(<Timer isOn={true} durationInSeconds={10} />);
};

describe('FloatingInput component', () => {
  it('should render component', () => {
    vi.useFakeTimers();
    setup();
    expect(screen.getByText('10')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
