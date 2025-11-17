import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import MessageProvider from '../MessageProvider';
import useMessage from '../../hooks/useMessage';
import { MessageColor } from '../../context/MessageContext';

// Mock child component to test the context
const TestComponent: React.FC = () => {
  const { message, setMessage } = useMessage();
  
  return (
    <div>
      <div data-testid="message-text">{message.text}</div>
      <div data-testid="message-color">{message.color}</div>
      <button 
        onClick={() => setMessage({ text: 'New message', color: MessageColor.Success })}
        data-testid="update-button"
      >
        Update Message
      </button>
    </div>
  );
};

describe('MessageProvider', () => {
  it('provides default message state', () => {
    render(
      <MessageProvider>
        <TestComponent />
      </MessageProvider>
    );
    
    expect(screen.getByTestId('message-text')).toHaveTextContent('');
    expect(screen.getByTestId('message-color')).toHaveTextContent('danger');
  });

  it('allows updating message state', () => {
    render(
      <MessageProvider>
        <TestComponent />
      </MessageProvider>
    );
    
    // Initial state
    expect(screen.getByTestId('message-text')).toHaveTextContent('');
    expect(screen.getByTestId('message-color')).toHaveTextContent('danger');
    
    // Update message
    act(() => {
      screen.getByTestId('update-button').click();
    });
    
    // Updated state
    expect(screen.getByTestId('message-text')).toHaveTextContent('New message');
    expect(screen.getByTestId('message-color')).toHaveTextContent('success');
  });

  it('renders children correctly', () => {
    render(
      <MessageProvider>
        <div data-testid="child-component">Child Content</div>
      </MessageProvider>
    );
    
    expect(screen.getByTestId('child-component')).toHaveTextContent('Child Content');
  });

  it('maintains context provider structure', () => {
    const { container } = render(
      <MessageProvider>
        <div>Test</div>
      </MessageProvider>
    );
    
    // Should render without errors
    expect(container.firstChild).toBeInTheDocument();
  });
});