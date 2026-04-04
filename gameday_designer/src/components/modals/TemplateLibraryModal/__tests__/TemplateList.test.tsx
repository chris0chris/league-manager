import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TemplateList from '../TemplateList';
import { designerApi } from '../../../../api/designerApi';

vi.mock('../../../../api/designerApi');

const mockEmptyResponse = { results: [], count: 0, next: null, previous: null };

describe('TemplateList', () => {
  it('always shows Tournament Formats group with built-in templates', async () => {
    vi.mocked(designerApi.listTemplates).mockResolvedValue(mockEmptyResponse);
    render(<TemplateList selectedId={null} onSelect={vi.fn()} searchQuery="" filterScope="all" />);
    expect(screen.getByText('Tournament Formats')).toBeInTheDocument();
    expect(screen.getByText(/6 Teams/i)).toBeInTheDocument();
  });

  it('hides My Templates group when API returns empty', async () => {
    vi.mocked(designerApi.listTemplates).mockResolvedValue(mockEmptyResponse);
    render(<TemplateList selectedId={null} onSelect={vi.fn()} searchQuery="" filterScope="all" />);
    await waitFor(() => {
      expect(screen.queryByText('My Templates')).not.toBeInTheDocument();
    });
  });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(designerApi.listTemplates).mockReturnValue(new Promise(() => {}));
    render(<TemplateList selectedId={null} onSelect={vi.fn()} searchQuery="" filterScope="all" />);
    expect(screen.getByTestId('template-list-loading')).toBeInTheDocument();
  });

  it('shows error state with retry button on fetch failure', async () => {
    vi.mocked(designerApi.listTemplates).mockRejectedValue(new Error('Network error'));
    render(<TemplateList selectedId={null} onSelect={vi.fn()} searchQuery="" filterScope="all" />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('calls onSelect with template when item is clicked', async () => {
    const mockTemplate = {
      id: 1, name: 'Club Standard', sharing: 'PRIVATE' as const,
      num_teams: 6, num_fields: 2, num_groups: 1, game_duration: 70,
      association: null, created_by: 1, updated_by: 1, created_at: '', updated_at: '',
    };
    // Return template only for personal scope to avoid duplicates
    vi.mocked(designerApi.listTemplates).mockImplementation(async (params) => {
      if (params?.sharing === 'personal') return { results: [mockTemplate], count: 1, next: null, previous: null };
      return mockEmptyResponse;
    });
    const onSelect = vi.fn();
    render(<TemplateList selectedId={null} onSelect={onSelect} searchQuery="" filterScope="all" />);
    await waitFor(() => screen.getByText('Club Standard'));
    screen.getByText('Club Standard').click();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ type: 'saved', template: expect.objectContaining({ id: 1 }) }));
  });
});
