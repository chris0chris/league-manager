/**
 * Comprehensive Tests for GameTable Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GameTable from '../GameTable';
import { GamedayProvider } from '../../../context/GamedayContext';
import i18n from '../../../i18n/testConfig';
import type { GameNode, StageNode, FieldNode, GlobalTeam, GlobalTeamGroup, FlowEdge } from '../../../types/flowchart';
import { createFieldNode, createStageNode, createGameNodeInStage } from '../../../types/flowchart';

describe('GameTable', () => {
  let field1: FieldNode;
  let stage1: StageNode;
  let stage2: StageNode;
  let game1: GameNode;
  let game2: GameNode;
  let team1: GlobalTeam;
  let teamGroup1: GlobalTeamGroup;

  let mockOnUpdate: ReturnType<typeof vi.fn>;
  let mockOnDelete: ReturnType<typeof vi.fn>;
  let mockOnSelectNode: ReturnType<typeof vi.fn>;
  let mockOnAssignTeam: ReturnType<typeof vi.fn>;
  let mockOnAddGameToGameEdge: ReturnType<typeof vi.fn>;
  let mockOnAddStageToGameEdge: ReturnType<typeof vi.fn>;
  let mockOnRemoveEdgeFromSlot: ReturnType<typeof vi.fn>;
  let mockOnDynamicReferenceClick: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();

    field1 = createFieldNode('field-1', { name: 'Field 1', order: 0 });
    stage1 = createStageNode('stage-1', 'field-1', { name: 'Stage 1', category: 'preliminary', order: 0 });
    stage2 = createStageNode('stage-2', 'field-1', { name: 'Stage 2', category: 'final', order: 1 });
    
    // game1 is in stage1
    game1 = createGameNodeInStage('game-1', 'stage-1', { standing: 'Quali 1', stage: 'Stage 1' });
    // game2 is in stage2
    game2 = createGameNodeInStage('game-2', 'stage-2', { 
      standing: 'Game 2', 
      startTime: '10:00', 
      manualTime: true,
      stage: 'Stage 2' 
    });

    teamGroup1 = { id: 'group-1', name: 'Group A', order: 0 };
    team1 = { id: 'team-1', label: 'Team A', groupId: 'group-1', order: 0 };

    mockOnUpdate = vi.fn();
    mockOnDelete = vi.fn();
    mockOnSelectNode = vi.fn();
    mockOnAssignTeam = vi.fn();
    mockOnAddGameToGameEdge = vi.fn();
    mockOnAddStageToGameEdge = vi.fn();
    mockOnRemoveEdgeFromSlot = vi.fn();
    mockOnDynamicReferenceClick = vi.fn();
  });

  const renderTable = (props = {}) => {
    return render(
      <GamedayProvider>
        <GameTable
          games={[game2]}
          edges={[]}
          allNodes={[field1, stage1, stage2, game1, game2]}
          globalTeams={[team1]}
          globalTeamGroups={[teamGroup1]}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onSelectNode={mockOnSelectNode}
          selectedNodeId={null}
          onAssignTeam={mockOnAssignTeam}
          onAddGameToGameEdge={mockOnAddGameToGameEdge}
          onAddStageToGameEdge={mockOnAddStageToGameEdge}
          onRemoveEdgeFromSlot={mockOnRemoveEdgeFromSlot}
          onDynamicReferenceClick={mockOnDynamicReferenceClick}
          {...props}
        />
      </GamedayProvider>
    );
  };

  it('renders table headers', () => {
    renderTable();
    expect(screen.getByText(/label.standing/i)).toBeInTheDocument();
    expect(screen.getByText(/label.home/i)).toBeInTheDocument();
    expect(screen.getByText(/label.away/i)).toBeInTheDocument();
  });

  describe('Inline editing', () => {
    it('saves standing on Enter', async () => {
      const user = userEvent.setup();
      renderTable();
      await user.click(screen.getByText('Game 2'));
      const input = screen.getByDisplayValue('Game 2');
      await user.clear(input);
      await user.type(input, 'New Name{Enter}');
      expect(mockOnUpdate).toHaveBeenCalledWith('game-2', { standing: 'New Name' });
    });

    it('saves break after on Enter', async () => {
      const user = userEvent.setup();
      renderTable();
      await user.click(screen.getByText('0'));
      const input = screen.getByDisplayValue('0');
      await user.clear(input);
      await user.type(input, '15{Enter}');
      expect(mockOnUpdate).toHaveBeenCalledWith('game-2', { breakAfter: 15 });
    });

    it('saves time on blur', async () => {
      const { container } = renderTable({ games: [game1], allNodes: [field1, stage1, stage2, game1, game2] });
      fireEvent.click(screen.getByText('Quali 1'));
      const timeCell = screen.getByText('--:--');
      fireEvent.click(timeCell);
      const input = container.querySelector('input[type="time"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '14:00' } });
      fireEvent.blur(input);
      expect(mockOnUpdate).toHaveBeenCalledWith('game-1', { startTime: '14:00', manualTime: true });
    });

    it('clears time when empty', async () => {
      const { container } = renderTable({ games: [game2] });
      fireEvent.click(screen.getByText('10:00'));
      const input = container.querySelector('input[type="time"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);
      expect(mockOnUpdate).toHaveBeenCalledWith('game-2', { startTime: undefined, manualTime: false });
    });
  });

  describe('Official assignment', () => {
    it('assigns first team when checked', async () => {
      const user = userEvent.setup();
      renderTable();
      await user.click(screen.getByRole('checkbox'));
      expect(mockOnUpdate).toHaveBeenCalledWith('game-2', { official: 'team-1' });
    });

    it('removes official when unchecked', async () => {
      const user = userEvent.setup();
      const gameWithOfficial = { ...game2, data: { ...game2.data, official: 'team-1' } };
      renderTable({ games: [gameWithOfficial] });
      await user.click(screen.getByRole('checkbox'));
      expect(mockOnUpdate).toHaveBeenCalledWith('game-2', { official: undefined });
    });
  });

  describe('Dynamic reference interactions', () => {
    it('renders and allows clicking game-to-game ref', async () => {
      const user = userEvent.setup();
      const gameWithWinner = {
        ...game2,
        data: { ...game2.data, homeTeamDynamic: { type: 'winner', matchName: 'Quali 1' } }
      } as GameNode;
      const edges = [{
        id: 'e1', type: 'gameToGame', source: 'game-1', target: 'game-2', sourceHandle: 'winner', targetHandle: 'home', data: { sourcePort: 'winner', targetPort: 'home' }
      } as FlowEdge];

      renderTable({ games: [gameWithWinner], edges });
      
      const refElement = screen.getByText(/Winner of Quali 1/i).closest('div');
      expect(refElement).toBeInTheDocument();
      await user.click(refElement!);
      expect(mockOnDynamicReferenceClick).toHaveBeenCalledWith('game-1');
    });

    it('renders and allows clicking rank ref', async () => {
      const user = userEvent.setup();
      const rankingStage: StageNode = {
        ...stage1,
        id: 'stage-ranking',
        parentId: 'field-1',
        data: { ...stage1.data, stageType: 'RANKING', name: 'Placement', order: 0 }
      };
      
      // game1 must be IN the rankingStage for participants to be found
      const gameInRanking = {
        ...game1,
        parentId: 'stage-ranking',
        data: { ...game1.data, homeTeamId: 'team-1', awayTeamId: 'team-2' }
      };

      const gameWithRank: GameNode = {
        ...game2,
        parentId: 'stage-2',
        data: { 
          ...game2.data, 
          stage: 'Stage 2',
          homeTeamDynamic: { type: 'rank', place: 1, stageId: 'stage-ranking', stageName: 'Placement' } 
        }
      };
      
      const edges = [{
        id: 'e1', 
        type: 'stageToGame', 
        source: 'stage-ranking', 
        target: 'game-2', 
        sourceHandle: 'rank-1', 
        targetHandle: 'home', 
        data: { sourceRank: 1, targetPort: 'home' }
      } as FlowEdge];

      renderTable({ 
        games: [gameWithRank], 
        edges, 
        allNodes: [field1, rankingStage, stage2, gameInRanking, gameWithRank] 
      });
      
      const refElement = screen.getByText(/1. Place from Placement/i).closest('div');
      expect(refElement).toBeInTheDocument();
      await user.click(refElement!);
      expect(mockOnDynamicReferenceClick).toHaveBeenCalledWith('stage-ranking');
    });
  });
});