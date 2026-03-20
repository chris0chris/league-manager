import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DisplayAllTicks from '../DisplayAllTicks';
import { vi } from 'vitest';

const mockSetLoadAllTicks = vi.fn();

const setup = (loadAllTicks = false) => {
  render(
    <DisplayAllTicks 
      loadAllTicks={loadAllTicks} 
      setLoadAllTicks={mockSetLoadAllTicks} 
    />
  );
};

describe('DisplayAllTicks component', () => {
  beforeEach(() => {
    mockSetLoadAllTicks.mockClear();
  });

  it('should render FaInfinity icon when loadAllTicks is false', () => {
    setup(false);
    
    expect(screen.getByTitle('Klicken, um alle Einträge anzuzeigen')).toBeInTheDocument();
    expect(screen.queryByTitle('Klicken, um die letzten 5 Einträge anzuzeigen')).not.toBeInTheDocument();
  });

  it('should render GiCancel icon when loadAllTicks is true', () => {
    setup(true);
    
    expect(screen.getByTitle('Klicken, um die letzten 5 Einträge anzuzeigen')).toBeInTheDocument();
    expect(screen.queryByTitle('Klicken, um alle Einträge anzuzeigen')).not.toBeInTheDocument();
  });

  it('should call setLoadAllTicks with toggled value when clicked', async () => {
    const user = userEvent.setup();
    setup(false);
    
    await user.click(screen.getByTitle('Klicken, um alle Einträge anzuzeigen'));
    
    expect(mockSetLoadAllTicks).toHaveBeenCalledWith(true);
  });

  it('should call setLoadAllTicks with toggled value when clicked and loadAllTicks is true', async () => {
    const user = userEvent.setup();
    setup(true);
    
    await user.click(screen.getByTitle('Klicken, um die letzten 5 Einträge anzuzeigen'));
    
    expect(mockSetLoadAllTicks).toHaveBeenCalledWith(false);
  });
});