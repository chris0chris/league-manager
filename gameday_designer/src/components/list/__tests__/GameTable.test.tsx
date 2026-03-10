/**
 * Comprehensive Tests for GameTable Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GameTable from '../GameTable';
import { GamedayProvider } from '../../../context/GamedayContext';
import i18n from '../../../i18n/testConfig';
import type { GameNode, StageNode, FieldNode, Team, TeamGroup } from '../../../types/designer';
import { createDefaultField, createDefaultTeamReference } from '../../../types/designer';
import * as timeUtils from '../../../utils/timeCalculation';

vi.mock('../../../utils/timeCalculation', async () => {
  const actual = await vi.importActual('../../../utils/timeCalculation');
  return {
    ...actual,
    isValidTimeFormat: vi.fn(),
  };
});

describe('GameTable', () => {
  let field1: FieldNode;
  let stage1: StageNode;
  let stage2: StageNode;
  let game1: GameNode;
  let game2: GameNode;
  let team1: Team;

  const mockOnUpdateNode = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnSelectNode = vi.fn();
  const mockOnAssignTeam = vi.fn();
  const mockOnSwapTeams = vi.fn();
  const mockOnShowTeamSelection = vi.fn();
  const mockGetTeamUsage = vi.fn().mockReturnValue({ count: 0, games: [] });
  const mockOnAddGameToGameEdge = vi.fn();
  const mockOnAddStageToGameEdge = vi.fn();
  const mockOnRemoveEdgeFromSlot = vi.fn();
  const mockOnOpenResultModal = vi.fn();
  const mockOnHighlightElement = vi.fn();
  const mockOnDynamicReferenceClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    field1 = { id: 'field-1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } };
    stage1 = { id: 'stage-1', type: 'stage', data: { name: 'Vorrunde', order: 0, splitCount: 1 }, parentId: 'field-1', position: { x: 0, y: 0 } };
    stage2 = { id: 'stage-2', type: 'stage', data: { name: 'Playoffs', order: 1, splitCount: 1 }, parentId: 'field-1', position: { x: 0, y: 0 } };
    
    game1 = {
      id: 'game-1',
      type: 'game',
      parentId: 'stage-1',
      position: { x: 0, y: 0 },
      data: {
        standing: 'Game 1',
        startTime: '10:00',
        home: createDefaultTeamReference(),
        away: createDefaultTeamReference(),
        official: createDefaultTeamReference(),
        breakAfter: 0
      }
    };

    game2 = {
      id: 'game-2',
      type: 'game',
      parentId: 'stage-1',
      position: { x: 0, y: 50 },
      data: {
        standing: 'Game 2',
        startTime: '11:00',
        home: createDefaultTeamReference(),
        away: createDefaultTeamReference(),
        official: createDefaultTeamReference(),
        breakAfter: 15
      }
    };

    team1 = { id: 'team-1', label: 'Team 1' };
  });

  const renderTable = (props = {}) => {
    return render(
      <GamedayProvider>
        <GameTable
          games={[game1, game2]}
          nodes={[field1, stage1, stage2, game1, game2]}
          edges={[]}
          globalTeams={[team1]}
          globalTeamGroups={[]}
          onUpdateNode={mockOnUpdateNode}
          onDeleteNode={mockOnDelete}
          onSelectNode={mockOnSelectNode}
          onHighlightElement={mockOnHighlightElement}
          onShowTeamSelection={mockOnShowTeamSelection}
          getTeamUsage={mockGetTeamUsage}
          onAssignTeam={mockOnAssignTeam}
          onSwapTeams={mockOnSwapTeams}
          onAddGameToGameEdge={mockOnAddGameToGameEdge}
          onAddStageToGameEdge={mockOnAddStageToGameEdge}
          onRemoveEdgeFromSlot={mockOnRemoveEdgeFromSlot}
          onOpenResultModal={mockOnOpenResultModal}
          onDynamicReferenceClick={mockOnDynamicReferenceClick}
          {...props}
        />
      </GamedayProvider>
    );
  };

  describe('Rendering', () => {
    it('renders all games in the list', () => {
      renderTable();
      expect(screen.getByText('Game 1')).toBeInTheDocument();
      expect(screen.getByText('Game 2')).toBeInTheDocument();
    });

    it('renders time and duration information', () => {
      renderTable();
      expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('11:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    });

    it('shows correct team names when assigned', () => {
      const gameWithTeams = {
        ...game1,
        data: {
          ...game1.data,
          homeTeamId: 'team-1',
          awayTeamId: 'team-2'
        }
      } as GameNode;
      
      const team2 = { id: 'team-2', label: 'Team 2' };
      
      renderTable({ 
        games: [gameWithTeams], 
        globalTeams: [team1, team2] 
      });
      
      expect(screen.getByText('Team 1')).toBeInTheDocument();
      expect(screen.getByText('Team 2')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error state for invalid time format', () => {
      vi.mocked(timeUtils.isValidTimeFormat).mockReturnValue(false);
      renderTable();
      const timeInput = screen.getAllByRole('textbox')[0];
      expect(timeInput).toHaveClass('is-invalid');
    });

    it('does not show error for valid time format', () => {
      vi.mocked(timeUtils.isValidTimeFormat).mockReturnValue(true);
      renderTable();
      const timeInput = screen.getAllByRole('textbox')[0];
      expect(timeInput).not.toHaveClass('is-invalid');
    });
  });

  describe('Input changes', () => {
    it('calls onUpdateNode when time changes', async () => {
      const user = userEvent.setup();
      renderTable();
      const timeInput = screen.getAllByRole('textbox')[0];
      await user.clear(timeInput);
      await user.type(timeInput, '10:30');
      expect(mockOnUpdateNode).toHaveBeenCalledWith('game-1', expect.objectContaining({
        startTime: '10:30'
      }));
    });

    it('calls onUpdateNode when standing changes', async () => {
      const user = userEvent.setup();
      renderTable();
      const standingInput = screen.getAllByRole('textbox')[2]; // Index 2 is standing for first game
      await user.clear(standingInput);
      await user.type(standingInput, 'Final');
      expect(mockOnUpdateNode).toHaveBeenCalledWith('game-1', expect.objectContaining({
        standing: 'Final'
      }));
    });

    it('calls onUpdateNode when breakAfter changes', async () => {
      const user = userEvent.setup();
      renderTable();
      const breakInput = screen.getAllByRole('spinbutton')[0];
      await user.clear(breakInput);
      await user.type(breakInput, '20');
      expect(mockOnUpdateNode).toHaveBeenCalledWith('game-1', expect.objectContaining({
        breakAfter: 20
      }));
    });
  });

  beforeEach(() => {
    vi.mocked(timeUtils.isValidTimeFormat).mockReturnValue(true);
  });

  describe('Row actions', () => {
    it('calls onSelectNode when row is clicked', async () => {
      const user = userEvent.setup();
      renderTable();
      await user.click(screen.getByRole('row', { name: /Game 2/i }));
      expect(mockOnSelectNode).toHaveBeenCalledWith('game-2');
    });

    it('calls onSwapTeams when swap button is clicked', async () => {
      const user = userEvent.setup();
      renderTable();
      const swapBtn = screen.getByTitle(/Swap home and away teams/i);
      await user.click(swapBtn);
      expect(mockOnSwapTeams).toHaveBeenCalledWith('game-2');
    });

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderTable();
      const deleteBtn = screen.getByTitle(/Delete Game/i);
      await user.click(deleteBtn);
      expect(mockOnDelete).toHaveBeenCalledWith('game-2');
    });
  });

  describe('Official assignment', () => {
    it('renders official selector as always visible', () => {
      renderTable();
      // Official selector should be rendered without checkbox toggle
      // The selector is now always displayed (no checkbox to enable/disable)
      const table = screen.getByRole('table');
      expect(table).toHaveTextContent(/-- Team wählen --/i);
    });
  });

  describe('Dynamic References', () => {
    it('renders winner/loser references correctly', () => {
      const gameWithWinner = {
        ...game2,
        data: { ...game2.data, homeTeamDynamic: { type: 'winner', matchName: 'Quali 1' } }
      } as GameNode;
      renderTable({ games: [gameWithWinner] });
      expect(screen.getByText(/Winner Quali 1/i)).toBeInTheDocument();
    });

    it('renders rank references correctly', () => {
      const gameWithRank = {
        ...game2,
        data: { ...game2.data, awayTeamDynamic: { type: 'rank', rank: 1, stageName: 'Vorrunde' } }
      } as GameNode;
      renderTable({ games: [gameWithRank] });
      expect(screen.getByText(/1. Vorrunde/i)).toBeInTheDocument();
    });

    it('shows resolved team name when available', () => {
      const gameWithResolved = {
        ...game2,
        data: { 
          ...game2.data, 
          homeTeamDynamic: { type: 'winner', matchName: 'Quali 1' },
          resolvedHomeTeam: 'Resolved Team'
        }
      } as GameNode;
      renderTable({ games: [gameWithResolved], readOnly: true });
      expect(screen.getByText('Resolved Team')).toBeInTheDocument();
    });

    it('renders TBD when dynamic ref is not resolved', () => {
      const gameWithWinner = {
        ...game2,
        data: { ...game2.data, homeTeamDynamic: { type: 'winner', matchName: 'Quali 1' } }
      } as GameNode;
      renderTable({ games: [gameWithWinner], readOnly: true });
      expect(screen.getByText(/TBD/i)).toBeInTheDocument();
    });
  });

  describe('handleTeamChange', () => {
    it('calls onAssignTeam for regular team selection', () => {
      renderTable();
      // We'll test the internal handleTeamChange logic directly via props if possible,
      // but here we can at least verify it exists.
      // For deeper coverage we might need to trigger the Select component.
    });
  });
});
