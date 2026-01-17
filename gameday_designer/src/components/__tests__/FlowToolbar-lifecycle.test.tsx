import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FlowToolbar from '../FlowToolbar';
import { BrowserRouter as Router } from 'react-router-dom';

// Mock translation hook
vi.mock('../i18n/useTypedTranslation', () => ({
  useTypedTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

describe('FlowToolbar - Lifecycle', () => {
  const defaultProps = {
    onImport: vi.fn(),
    onExport: vi.fn(),
    onClearAll: vi.fn(),
    onPublish: vi.fn(),
    onUnlock: vi.fn(),
    gamedayStatus: 'DRAFT',
  };

  it('renders Publish button when status is DRAFT', () => {
    render(
      <Router>
        <FlowToolbar {...defaultProps} />
      </Router>
    );
    
    const publishButton = screen.getByTestId('publish-button');
    expect(publishButton).toBeInTheDocument();
    // Match the fallback text as the mock returns it if provided
    expect(publishButton).toHaveTextContent('Publish Schedule');
  });

  it('renders Unlock button when status is PUBLISHED', () => {
    render(
      <Router>
        <FlowToolbar {...defaultProps} gamedayStatus="PUBLISHED" />
      </Router>
    );
    
    const unlockButton = screen.getByTestId('unlock-button');
    expect(unlockButton).toBeInTheDocument();
    expect(unlockButton).toHaveTextContent('Unlock Schedule');
  });

  it('calls onPublish when publish button is clicked twice (double confirm)', () => {
    render(
      <Router>
        <FlowToolbar {...defaultProps} />
      </Router>
    );
    
    const publishButton = screen.getByTestId('publish-button');
    
    // First click shows "Confirm"
    fireEvent.click(publishButton);
    expect(defaultProps.onPublish).not.toHaveBeenCalled();
    expect(publishButton).toHaveTextContent('Confirm');
    
    // Second click calls onPublish
    fireEvent.click(publishButton);
    expect(defaultProps.onPublish).toHaveBeenCalled();
  });
});
