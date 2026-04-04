import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TemplatePreview from '../TemplatePreview';
import { SelectedTemplate } from '../TemplateList';
import type { TournamentTemplate } from '../../../../types/tournament';

const mockBuiltinTemplate = {
  id: 'f6_2_2',
  name: '6-Team Cup',
  teamCount: { min: 6, max: 6 },
  fieldOptions: [2],
  stages: [],
  timing: { firstGameStartTime: '09:00', defaultGameDuration: 15, defaultBreakBetweenGames: 5 },
};

const mockSavedTemplate = {
  id: 1, name: 'Club Standard', sharing: 'PRIVATE' as const,
  num_teams: 8, num_fields: 2, num_groups: 2, game_duration: 70,
  association: null, created_by: 1, updated_by: 1, created_at: '2026-01-12T00:00:00Z', updated_at: '2026-01-12T00:00:00Z',
};

describe('TemplatePreview', () => {
  it('renders empty state when no template selected', () => {
    render(<TemplatePreview selected={null} currentUserId={1} onApply={vi.fn()} onClone={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText(/select a template/i)).toBeInTheDocument();
  });

  it('shows Apply button for built-in template', () => {
    const selected: SelectedTemplate = { type: 'builtin', template: mockBuiltinTemplate as unknown as TournamentTemplate };
    render(<TemplatePreview selected={selected} currentUserId={1} onApply={vi.fn()} onClone={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  it('shows Delete button only when currentUserId matches created_by', () => {
    const selected: SelectedTemplate = { type: 'saved', template: mockSavedTemplate };
    render(<TemplatePreview selected={selected} currentUserId={1} onApply={vi.fn()} onClone={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('hides Delete button when currentUserId does not match created_by', () => {
    const selected: SelectedTemplate = { type: 'saved', template: { ...mockSavedTemplate, created_by: 99 } };
    render(<TemplatePreview selected={selected} currentUserId={1} onApply={vi.fn()} onClone={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('calls onApply when Apply is clicked', () => {
    const onApply = vi.fn();
    const selected: SelectedTemplate = { type: 'saved', template: mockSavedTemplate };
    render(<TemplatePreview selected={selected} currentUserId={1} onApply={onApply} onClone={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onApply).toHaveBeenCalledWith(selected, expect.objectContaining({
      startTime: '09:00',
      gameDuration: 70,
      breakDuration: 0,
      numFields: 2,
    }));
  });

  it('Number of fields input appears for saved template but not builtin', () => {
    const selected: SelectedTemplate = { type: 'saved', template: mockSavedTemplate };
    const { rerender } = render(<TemplatePreview selected={selected} currentUserId={1} onApply={vi.fn()} onClone={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/number of fields/i)).toBeInTheDocument();

    const builtinSelected: SelectedTemplate = { type: 'builtin', template: mockBuiltinTemplate as unknown as TournamentTemplate };
    rerender(<TemplatePreview selected={builtinSelected} currentUserId={1} onApply={vi.fn()} onClone={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByLabelText(/number of fields/i)).not.toBeInTheDocument();
  });
});
