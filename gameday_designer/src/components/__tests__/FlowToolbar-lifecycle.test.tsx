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

  it('renders Publish button in Actions dropdown when status is DRAFT', async () => {
    render(
      <Router>
        <FlowToolbar {...defaultProps} />
      </Router>
    );
    
    // Open dropdown
    fireEvent.click(screen.getByText('Actions'));
    
    const publishItem = screen.getByText('Publish Schedule');
    expect(publishItem).toBeInTheDocument();
  });

  it('renders Unlock button in Actions dropdown when status is PUBLISHED', async () => {
    render(
      <Router>
        <FlowToolbar {...defaultProps} gamedayStatus="PUBLISHED" />
      </Router>
    );
    
    // Open dropdown
    fireEvent.click(screen.getByText('Actions'));
    
    const unlockItem = screen.getByText('Unlock Schedule');
    expect(unlockItem).toBeInTheDocument();
  });

  it('calls onPublish when publish item is clicked', () => {
    render(
      <Router>
        <FlowToolbar {...defaultProps} />
      </Router>
    );
    
    // Open dropdown
    fireEvent.click(screen.getByText('Actions'));
    
    const publishItem = screen.getByText('Publish Schedule');
    fireEvent.click(publishItem);
    
    expect(defaultProps.onPublish).toHaveBeenCalled();
  });
});
