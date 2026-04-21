import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TemplateLibraryModal from '../../TemplateLibraryModal';
import { designerApi } from '../../../../api/designerApi';

vi.mock('../../../../api/designerApi');

const mockEmpty = { results: [], count: 0, next: null, previous: null };

describe('TemplateLibraryModal', () => {
  beforeEach(() => {
    vi.mocked(designerApi.listTemplates).mockResolvedValue(mockEmpty);
  });

  it('renders when show=true', () => {
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} flowTeams={[]} />);
    expect(screen.getByText(/Template Library/i)).toBeInTheDocument();
  });

  it('shows search input and filter pills', () => {
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} flowTeams={[]} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('shows "Save current as template" button in titlebar', () => {
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} />);
    expect(screen.getByRole('button', { name: /save current/i })).toBeInTheDocument();
  });
});
