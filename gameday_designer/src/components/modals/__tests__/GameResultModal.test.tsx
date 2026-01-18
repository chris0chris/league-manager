import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GameResultModal from '../GameResultModal';
import type { GameNode } from '../../../types/flowchart';

// Mock translation hook
vi.mock('../../../i18n/useTypedTranslation', () => ({
  useTypedTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('GameResultModal', () => {
  const mockGame = {
    id: 'game1',
    data: {
      standing: 'Final',
      halftime_score: { home: 0, away: 0 },
      final_score: { home: 0, away: 0 },
    },
  };

  const defaultProps = {
    show: true,
    onHide: vi.fn(),
    onSave: vi.fn(),
    game: mockGame as unknown as GameNode,
    homeTeamName: 'Team Alpha',
    awayTeamName: 'Team Beta',
  };

  it('renders correctly with team names', () => {
    render(<GameResultModal {...defaultProps} />);
    
    expect(screen.getAllByText(/Team Alpha/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Team Beta/)[0]).toBeInTheDocument();
    expect(screen.getByText(/ui:label.halftimeScore/)).toBeInTheDocument();
    expect(screen.getByText(/ui:label.finalScore/)).toBeInTheDocument();
  });

  it('calls onSave with updated scores', () => {
    render(<GameResultModal {...defaultProps} />);
    
    const homeHalftimeInput = screen.getByLabelText(/Team Alpha.*ui:label.halftime/i);
    fireEvent.change(homeHalftimeInput, { target: { value: '14' } });
    
    const saveButton = screen.getByRole('button', { name: /ui:button.save/i });
    fireEvent.click(saveButton);
    
    expect(defaultProps.onSave).toHaveBeenCalledWith({
      halftime_score: { home: 14, away: 0 },
      final_score: { home: 0, away: 0 },
    });
  });
});
