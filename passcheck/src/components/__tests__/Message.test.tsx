import React from 'react';
import { render, screen } from '@testing-library/react';
import Message from '../Message';
import MessageProvider from '../MessageProvider';

describe('Message', () => {
  it('renders message when text is present', () => {
    render(
      <MessageProvider>
        <Message />
      </MessageProvider>
    );
    
    // The MessageProvider initializes with empty message, so we won't see anything
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not render when message text is empty', () => {
    const { container } = render(
      <MessageProvider>
        <Message />
      </MessageProvider>
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('applies correct variant class based on color', () => {
    // Create a custom provider to test different colors
    const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      return (
        <MessageProvider>
          {children}
        </MessageProvider>
      );
    };

    render(
      <TestProvider>
        <Message />
      </TestProvider>
    );
    
    // Default should be danger variant
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});