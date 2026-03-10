import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDesignerController } from '../useDesignerController';
import { useFlowState } from '../useFlowState';
import * as flowchartExport from '../../utils/flowchartExport';
import * as flowchartImport from '../../utils/flowchartImport';
import * as scrollHelpers from '../../utils/scrollHelpers';
import * as tournamentGenerator from '../../utils/tournamentGenerator';
import * as teamAssignment from '../../utils/teamAssignment';
import { DEFAULT_TOURNAMENT_GROUP_NAME } from '../../utils/tournamentConstants';
import type { TournamentGenerationConfig } from '../../types/tournament';
import type { TournamentStructure } from '../../utils/tournamentGenerator';

// Mock utilities
vi.mock('../../utils/flowchartExport', () => ({
  downloadFlowchartAsJson: vi.fn(),
  validateForExport: vi.fn(() => []),
}));

vi.mock('../../utils/flowchartImport', () => ({
  importFromScheduleJson: vi.fn(),
  validateScheduleJson: vi.fn(() => []),
}));

vi.mock('../../utils/scrollHelpers', () => ({
  scrollToGameWithExpansion: vi.fn().mockResolvedValue(undefined),
  scrollToElementWithExpansion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/tournamentGenerator', () => ({
  generateTournament: vi.fn(),
}));

vi.mock('../../utils/teamAssignment', () => ({
  generateTeamsForTournament: vi.fn(() => []),
  assignTeamsToTournamentGames: vi.fn(() => []),
}));

// Mock window functions
vi.spyOn(window, 'confirm').mockImplementation(() => true);

describe('useDesignerController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UI State', () => {
    it('initializes with default UI state', () => {
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      expect(result.current.ui.showTournamentModal).toBe(false);
      expect(result.current.ui.highlightedElement).toBeNull();
      expect(result.current.ui.expandedFieldIds.size).toBe(0);
      expect(result.current.ui.canExport).toBe(false);
    });

    it('manages tournament modal visibility', () => {
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.setShowTournamentModal(true);
      });
      expect(result.current.ui.showTournamentModal).toBe(true);
    });

    it('can expand fields and stages', () => {
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.expandField('field-1');
        result.current.handlers.expandStage('stage-1');
      });
      
      expect(result.current.ui.expandedFieldIds.has('field-1')).toBe(true);
      expect(result.current.ui.expandedStageIds.has('stage-1')).toBe(true);
    });

    it('can dismiss notifications', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.addNotification('Test');
      });
      expect(result.current.notifications).toHaveLength(1);
      const id = result.current.notifications[0].id;

      act(() => {
        result.current.handlers.dismissNotification(id);
      });
      expect(result.current.notifications[0].show).toBe(false);

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current.notifications).toHaveLength(0);
      vi.useRealTimers();
    });
  });

  describe('Dynamic Reference Navigation', () => {
    it('handles dynamic reference clicks with scroll and highlight', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      let promise: Promise<void>;
      await act(async () => {
        promise = result.current.handlers.handleDynamicReferenceClick('game-1');
      });
      
      expect(result.current.ui.highlightedElement).toEqual({ id: 'game-1', type: 'game' });
      expect(scrollHelpers.scrollToElementWithExpansion).toHaveBeenCalled();
      
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      
      expect(result.current.ui.highlightedElement).toBeNull();
      await promise!;
      vi.useRealTimers();
    });
  });

  describe('Import/Export', () => {
    it('handles successful export', () => {
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.handleExport();
      });
      
      expect(flowchartExport.downloadFlowchartAsJson).toHaveBeenCalled();
    });

    it('shows warning notification if export validation has issues', () => {
      vi.mocked(flowchartExport.validateForExport).mockReturnValueOnce(['Error 1']);
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.handleExport();
      });
      
      expect(result.current.notifications).toHaveLength(2); // One warning, one success (as it doesn't block now)
      expect(result.current.notifications.some(n => n.type === 'warning')).toBe(true);
      expect(flowchartExport.downloadFlowchartAsJson).toHaveBeenCalled();
    });

    it('always downloads even with warnings (non-blocking notification pattern)', () => {
      vi.mocked(flowchartExport.validateForExport).mockReturnValueOnce(['Error 1']);
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.handleExport();
      });
      
      expect(flowchartExport.downloadFlowchartAsJson).toHaveBeenCalled();
    });

    it('handles invalid JSON import', () => {
      vi.mocked(flowchartImport.validateScheduleJson).mockReturnValueOnce(['Invalid JSON']);
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.handleImport({});
      });
      
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('danger');
      expect(result.current.notifications[0].message).toContain('Invalid JSON format');
    });

    it('handles successful import', () => {
      const mockState = { nodes: [], edges: [] };
      vi.mocked(flowchartImport.validateScheduleJson).mockReturnValue([]);
      vi.mocked(flowchartImport.importFromScheduleJson).mockReturnValue({ 
        success: true, 
        // @ts-expect-error - partial state for testing
        state: mockState as unknown as FlowState 
      });
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.handleImport({});
      });
      
      expect(result.current.notifications[0].type).toBe('success');
    });

    it('handles failed import processing', () => {
      vi.mocked(flowchartImport.importFromScheduleJson).mockReturnValueOnce({ 
        success: false, 
        errors: ['Import Error'] 
      });
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      act(() => {
        result.current.handlers.handleImport({});
      });
      
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('danger');
      expect(result.current.notifications[0].message).toContain('Import failed');
    });
  });

  describe('Tournament Generation', () => {
    const mockConfig = {
      template: { 
        id: 't1',
        name: 'Test',
        teamCount: { exact: 4 },
        fieldCount: 2,
        groupCount: 1,
        gameDuration: 30,
      },
      generateTeams: false,
      autoAssignTeams: false
    } as unknown as TournamentGenerationConfig & { generateTeams: boolean; autoAssignTeams: boolean };

    const mockStructure = { 
      fields: [], 
      stages: [], 
      games: [],
      edges: []
    } as TournamentStructure;

    it('generates tournament without teams', async () => {
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      vi.mocked(tournamentGenerator.generateTournament).mockReturnValueOnce(mockStructure);
      
      await act(async () => {
        await result.current.handlers.handleGenerateTournament(mockConfig);
      });
      
      expect(tournamentGenerator.generateTournament).toHaveBeenCalled();
      expect(result.current.ui.showTournamentModal).toBe(false);
    });

    it('creates new group if none exist during team generation', async () => {
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      vi.mocked(tournamentGenerator.generateTournament).mockReturnValue(mockStructure);
      vi.mocked(teamAssignment.generateTeamsForTournament).mockReturnValue([{ label: 'T1', color: '#000' }]);
      
      await act(async () => {
        await result.current.handlers.handleGenerateTournament({
          ...mockConfig,
          generateTeams: true
        });
      });
      
      expect(result.current.globalTeamGroups).toHaveLength(1);
      expect(result.current.globalTeamGroups[0].name).toBe(DEFAULT_TOURNAMENT_GROUP_NAME);
    });

    it('generates teams and assigns them if requested', async () => {
      vi.useFakeTimers();
      const { result: flowStateResult } = renderHook(() => useFlowState());
      const assignSpy = vi.spyOn(flowStateResult.current, 'assignTeamToGame');
      const { result } = renderHook(() => useDesignerController(flowStateResult.current));
      
      const mockTeams = [{ id: 'team-1', label: 'Team 1', color: '#ff0000' }];
      
      vi.mocked(tournamentGenerator.generateTournament).mockReturnValue(mockStructure);
      vi.mocked(teamAssignment.generateTeamsForTournament).mockReturnValue(mockTeams as unknown as Array<{ label: string; color: string }>);
       vi.mocked(teamAssignment.assignTeamsToTournamentGames).mockReturnValue([
         { type: 'assign_team', gameId: 'g1', teamId: 't1', slot: 'home' },
         // @ts-expect-error - partial edge for testing
         { type: 'add_edges', edges: [{ id: 'e1' } as unknown as FlowEdge] }
       ]);
      
      await act(async () => {
        await result.current.handlers.handleGenerateTournament({
          ...mockConfig,
          generateTeams: true,
          autoAssignTeams: true
        });
      });
      
      expect(teamAssignment.generateTeamsForTournament).toHaveBeenCalled();
      
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      
      expect(teamAssignment.assignTeamsToTournamentGames).toHaveBeenCalled();
      expect(assignSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('logs error on generation failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(tournamentGenerator.generateTournament).mockImplementationOnce(() => {
        throw new Error('Gen failed');
      });
      
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      
      await act(async () => {
        await result.current.handlers.handleGenerateTournament(mockConfig);
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to generate tournament:', expect.any(Error));
    });

    it('filters teams by selectedTeamIds', async () => {
      const { result } = renderHook(() => {
        const flowState = useFlowState({
          globalTeams: [
            { id: 't1', label: 'T1', groupId: null, order: 0 },
            { id: 't2', label: 'T2', groupId: null, order: 1 }
          ]
        });
        return useDesignerController(flowState);
      });
      
      vi.mocked(tournamentGenerator.generateTournament).mockReturnValue(mockStructure);
      
      await act(async () => {
        await result.current.handlers.handleGenerateTournament({
          ...mockConfig,
          selectedTeamIds: ['t1']
        });
      });
      
      expect(tournamentGenerator.generateTournament).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 't1' })]),
        expect.any(Object)
      );
      // t2 should NOT be in the call
      const callArgs = vi.mocked(tournamentGenerator.generateTournament).mock.calls[0][0];
      expect(callArgs).toHaveLength(1);
    });
  });

  describe('Other Handlers', () => {
    it('calls addFieldNode with includeStage=true', () => {
      const { result: flowStateResult } = renderHook(() => useFlowState());
      const spy = vi.spyOn(flowStateResult.current, 'addFieldNode');
      const { result } = renderHook(() => useDesignerController(flowStateResult.current));
      
      act(() => {
        result.current.handlers.handleAddFieldContainer();
      });
      expect(spy).toHaveBeenCalledWith({}, true);
    });

    it('calls addStageNode', () => {
      const { result: flowStateResult } = renderHook(() => useFlowState());
      const spy = vi.spyOn(flowStateResult.current, 'addStageNode');
      const { result } = renderHook(() => useDesignerController(flowStateResult.current));
      
      act(() => {
        result.current.handlers.handleAddStage('f1');
      });
      expect(spy).toHaveBeenCalledWith('f1');
    });

    it('calls addGlobalTeam', () => {
      const { result: flowStateResult } = renderHook(() => useFlowState());
      const spy = vi.spyOn(flowStateResult.current, 'addGlobalTeam');
      const { result } = renderHook(() => useDesignerController(flowStateResult.current));
      
      act(() => {
        result.current.handlers.handleAddGlobalTeam('g1');
      });
      expect(spy).toHaveBeenCalledWith(undefined, 'g1');
    });
  });

  describe('handleSwapTeams', () => {
    it('swaps home and away teams in a game', async () => {
      const TestComponent = () => {
        const flowState = useFlowState();
        const controller = useDesignerController(flowState);
        return { flowState, controller };
      };

      const { result } = renderHook(() => TestComponent());
      
      let gameId: string;
      act(() => {
        const game = result.current.flowState.addGameNode({
          homeTeamId: 'team-1',
          awayTeamId: 'team-2',
          homeTeamDynamic: 'Winner 1',
          awayTeamDynamic: 'Loser 1'
        });
        gameId = game.id;
      });

      act(() => {
        result.current.controller.handlers.handleSwapTeams(gameId);
      });

      const updatedGame = result.current.flowState.nodes.find(n => n.id === gameId);
      expect(updatedGame?.data).toMatchObject({
        homeTeamId: 'team-2',
        awayTeamId: 'team-1',
        homeTeamDynamic: 'Loser 1',
        awayTeamDynamic: 'Winner 1'
      });
    });
  });

  describe('Default props handling', () => {
    it('handles null or partial flowState gracefully', () => {
      // @ts-expect-error - testing invalid input
      const { result } = renderHook(() => useDesignerController(null));
      expect(result.current.ui.hasData).toBe(false);
      
      // Test default handlers don't crash and cover lines 35-50
      act(() => {
        result.current.handlers.handleDeleteNode('1');
        result.current.handlers.handleAddGlobalTeamGroup();
        result.current.handlers.handleAddFieldContainer();
        result.current.handlers.handleAddStage('f1');
        result.current.handlers.handleAddGlobalTeam('g1');
        result.current.handlers.handleClearAll();
        result.current.handlers.handleUpdateNode('1', {});
        result.current.handlers.handleSelectNode('1');
        result.current.handlers.handleUpdateGlobalTeam('1', {});
        result.current.handlers.handleDeleteGlobalTeam('1');
        result.current.handlers.handleReorderGlobalTeam('1', 0);
        result.current.handlers.handleAssignTeam('g1', 't1', 'home');
        result.current.handlers.handleExport();
      });
    });
  });
});