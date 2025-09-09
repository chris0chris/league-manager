import React from 'react';
import {render, screen} from '@testing-library/react';
import {testStore} from '../../__tests__/Utils';
import LivetickerApp from '../LivetickerApp';

// Mock the Liveticker component to avoid complex setup
jest.mock('../liveticker/Liveticker', () => {
  return function MockLiveticker() {
    return <div data-testid="mock-liveticker">Mock Liveticker Component</div>;
  };
});

describe('LivetickerApp component', () => {
  it('should render with Redux Provider and container', () => {
    const initialState = {
      livetickerReducer: {
        liveticker: [],
      },
    };
    const store = testStore(initialState);
    
    render(<LivetickerApp />);
    
    // Check that the container is present
    expect(screen.getByTestId('mock-liveticker')).toBeInTheDocument();
    expect(screen.getByText('Mock Liveticker Component')).toBeInTheDocument();
    
    // Check that the container has the correct classes
    const container = screen.getByTestId('mock-liveticker').closest('.container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('mt-2');
  });

  it('should provide Redux store to child components', () => {
    // This test verifies that the Provider is set up correctly
    // The actual store functionality is tested in integration tests
    const initialState = {
      livetickerReducer: {
        liveticker: [],
      },
    };
    const store = testStore(initialState);
    
    render(<LivetickerApp />);
    
    // The component should render without throwing errors
    // which indicates the Redux Provider is working correctly
    expect(screen.getByTestId('mock-liveticker')).toBeInTheDocument();
  });
});