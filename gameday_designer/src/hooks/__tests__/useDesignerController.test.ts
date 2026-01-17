import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDesignerController } from '../useDesignerController';
import { useFlowState } from '../useFlowState';
import * as flowchartExport from '../../utils/flowchartExport';
import * as flowchartImport from '../../utils/flowchartImport';
import * as scrollHelpers from '../../utils/scrollHelpers';
import * as tournamentGenerator from '../../utils/tournamentGenerator';
import * as teamAssignment from '../../utils/teamAssignment';
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
const mockConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => true);

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

    it('generates teams and assigns them if requested', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => {
        const flowState = useFlowState();
        return useDesignerController(flowState);
      });
      const mockTeams = [{ id: 'team-1', label: 'Team 1', color: '#ff0000' }];
      
      vi.mocked(tournamentGenerator.generateTournament).mockReturnValue(mockStructure);
      vi.mocked(teamAssignment.generateTeamsForTournament).mockReturnValue(mockTeams as unknown as Array<{ label: string; color: string }>);
      
      await act(async () => {
        await result.current.handlers.handleGenerateTournament({
          ...mockConfig,
          generateTeams: true,
          autoAssignTeams: true
        });
      });
      
      expect(teamAssignment.generateTeamsForTournament).toHaveBeenCalled();
      
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      
      expect(teamAssignment.assignTeamsToTournamentGames).toHaveBeenCalled();
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
  });
});