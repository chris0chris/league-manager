
import { renderHook } from '@testing-library/react';
import { useFlowValidation } from '../useFlowValidation';
import type { FlowNode } from '../../types/flowchart';
import { describe, it, expect } from 'vitest';

describe('useFlowValidation - New Warnings', () => {
  describe('No Teams Warning', () => {
    it('should warn when global team pool is empty', () => {
      const { result } = renderHook(() => useFlowValidation([], [], [], []));
      
      const warning = result.current.warnings.find(w => w.type === 'no_teams');
      expect(warning).toBeDefined();
      expect(warning?.messageKey).toBe('no_teams');
    });

    it('should not warn when global team pool has teams', () => {
      const teams: GlobalTeam[] = [{ id: 't1', label: 'Team 1', groupId: 'g1', order: 0 }];
      const { result } = renderHook(() => useFlowValidation([], [], [], teams));
      
      const warning = result.current.warnings.find(w => w.type === 'no_teams');
      expect(warning).toBeUndefined();
    });
  });

  describe('No Games Warning', () => {
    it('should warn when there are no games in the schedule', () => {
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'Stage 1', order: 0 }, position: { x: 0, y: 0 } }
      ];
      const { result } = renderHook(() => useFlowValidation(nodes, []));
      
      const warning = result.current.warnings.find(w => w.type === 'no_games');
      expect(warning).toBeDefined();
      expect(warning?.messageKey).toBe('no_games');
    });

    it('should not warn when there is at least one game', () => {
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'Stage 1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' }, position: { x: 0, y: 0 } }
      ];
      const { result } = renderHook(() => useFlowValidation(nodes, []));
      
      const warning = result.current.warnings.find(w => w.type === 'no_games');
      expect(warning).toBeUndefined();
    });
  });

  describe('Teams without Games Warning', () => {
    it('should warn when a team in the pool is not assigned to any game', () => {
      const teams: GlobalTeam[] = [
        { id: 't1', label: 'Team 1', groupId: 'g1', order: 0 },
        { id: 't2', label: 'Team 2', groupId: 'g1', order: 1 }
      ];
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'F1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'S1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1', homeTeamId: 't1', awayTeamId: null }, position: { x: 0, y: 0 } }
      ];
      // t2 is not assigned
      const { result } = renderHook(() => useFlowValidation(nodes, [], [], teams));
      
      const warning = result.current.warnings.find(w => w.type === 'team_without_games');
      expect(warning).toBeDefined();
      expect(warning?.messageParams?.team).toBe('Team 2');
    });

    it('should not warn when all teams are assigned', () => {
      const teams: GlobalTeam[] = [{ id: 't1', label: 'Team 1', groupId: 'g1', order: 0 }];
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'F1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'S1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' }, position: { x: 0, y: 0 } }
      ];
      const { result } = renderHook(() => useFlowValidation(nodes, [], [], teams));
      
      const warning = result.current.warnings.find(w => w.type === 'team_without_games');
      expect(warning).toBeUndefined();
    });
  });

  describe('Unused Fields Warning', () => {
    it('should warn when a field has no games but another field does', () => {
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'f2', type: 'field', data: { name: 'Field 2', order: 1 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'Stage 1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' }, position: { x: 0, y: 0 } }
      ];
      // f1 has games, f2 does not
      const { result } = renderHook(() => useFlowValidation(nodes, []));
      
      const warning = result.current.warnings.find(w => w.type === 'unused_field');
      expect(warning).toBeDefined();
      expect(warning?.messageParams?.field).toBe('Field 2');
    });

    it('should not warn if the entire schedule is empty', () => {
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'f2', type: 'field', data: { name: 'Field 2', order: 1 }, position: { x: 0, y: 0 } }
      ];
      const { result } = renderHook(() => useFlowValidation(nodes, []));
      
      const warning = result.current.warnings.find(w => w.type === 'unused_field');
      expect(warning).toBeUndefined();
    });
  });

  describe('Broken Dynamic Progressions Warning', () => {
    it('should warn when a game references a non-existent standing', () => {
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'F1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'S1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1', homeTeamDynamic: { type: 'winner', matchName: 'NonExistent' }, awayTeamId: 't2' }, position: { x: 0, y: 0 } }
      ];
      const { result } = renderHook(() => useFlowValidation(nodes, []));
      
      const warning = result.current.warnings.find(w => w.type === 'broken_progression');
      expect(warning).toBeDefined();
      expect(warning?.messageParams?.target).toBe('NonExistent');
    });

    it('should not warn for valid dynamic references', () => {
      const nodes: FlowNode[] = [
        { id: 'f1', type: 'field', data: { name: 'F1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 's1', type: 'stage', parentId: 'f1', data: { name: 'S1', order: 0 }, position: { x: 0, y: 0 } },
        { id: 'g1', type: 'game', parentId: 's1', data: { standing: 'G1', homeTeamId: 't1', awayTeamId: 't2' }, position: { x: 0, y: 0 } },
        { id: 'g2', type: 'game', parentId: 's1', data: { standing: 'G2', homeTeamDynamic: { type: 'winner', matchName: 'G1' }, awayTeamId: 't3' }, position: { x: 0, y: 0 } }
      ];
      const { result } = renderHook(() => useFlowValidation(nodes, []));
      
      const warning = result.current.warnings.find(w => w.type === 'broken_progression');
      expect(warning).toBeUndefined();
    });
  });
});
