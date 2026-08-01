import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TemplateLibraryModal from '../../TemplateLibraryModal';
import { designerApi } from '../../../../api/designerApi';

vi.mock('../../../../api/designerApi');

const mockEmpty = { results: [], count: 0, next: null, previous: null };

describe('TemplateLibraryModal', () => {
  beforeEach(() => {
    vi.mocked(designerApi.listTemplates).mockResolvedValue(mockEmpty);
    vi.mocked(designerApi.getConfig).mockResolvedValue({ mock_teams: false, is_staff: true, username: 'testuser', avatar_url: null });
  });

  it('renders when show=true', () => {
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} />);
    expect(screen.getByText(/Template Library/i)).toBeInTheDocument();
  });

  it('shows search input and filter pills', () => {
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('shows "Save current as template" button in titlebar for staff', async () => {
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save current/i })).toBeInTheDocument();
    });
  });

  it('shows "Save current as template" button for non-staff too', async () => {
    vi.mocked(designerApi.getConfig).mockResolvedValue({ mock_teams: false, is_staff: false, username: 'testuser', avatar_url: null });
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} />);
    await waitFor(() => {
      expect(designerApi.getConfig).toHaveBeenCalled();
    });
    expect(screen.getByRole('button', { name: /save current/i })).toBeInTheDocument();
  });

  it('lets a non-staff user open the save dialog with only Personal selectable', async () => {
    vi.mocked(designerApi.getConfig).mockResolvedValue({ mock_teams: false, is_staff: false, username: 'testuser', avatar_url: null });
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} />);

    await waitFor(() => {
      expect(designerApi.getConfig).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /save current/i }));

    expect(await screen.findByText(/save as template/i)).toBeInTheDocument();
    expect(screen.getByTestId('sharing-option-private')).toBeInTheDocument();
    expect(screen.queryByTestId('sharing-option-association')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sharing-option-global')).not.toBeInTheDocument();
  });

  it('lets a staff user open the save dialog with all sharing options selectable', async () => {
    vi.mocked(designerApi.getConfig).mockResolvedValue({ mock_teams: false, is_staff: true, username: 'testuser', avatar_url: null });
    render(<TemplateLibraryModal show onHide={vi.fn()} gamedayId={1} currentUserId={1} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save current/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /save current/i }));

    expect(await screen.findByText(/save as template/i)).toBeInTheDocument();
    expect(screen.getByTestId('sharing-option-private')).toBeInTheDocument();
    expect(screen.getByTestId('sharing-option-association')).toBeInTheDocument();
    expect(screen.getByTestId('sharing-option-global')).toBeInTheDocument();
  });
});
