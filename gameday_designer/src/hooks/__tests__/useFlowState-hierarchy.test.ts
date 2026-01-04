/**
 * Tests for useFlowState Hook - Container Hierarchy Enforcement
 *
 * TDD RED Phase: Tests for enforcing strict container hierarchy:
 * - Teams and games MUST be inside stage containers
 * - getTargetStage() helper function
 * - ensureContainerHierarchy() helper function
 * - addTeamNodeInStage() always places teams inside stages
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../useFlowState';
import {
  isFieldNode,
  isStageNode,
  isGameNode,
  isTeamNode,
  createFieldNode,
  createStageNode,
} from '../../types/flowchart';
import type { FlowNode } from '../../types/flowchart';

describe('useFlowState - Container Hierarchy Enforcement', () => {
  describe('getTargetStage', () => {
    it('returns selected stage when stage is selected', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        result.current.selectNode(stageId);
      });

      const targetStage = result.current.getTargetStage();
      expect(targetStage).toBeDefined();
      expect(targetStage?.id).toBe(stageId);
    });

    it('returns first stage of selected field when field is selected', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        result.current.addStageNode(fieldId); // Add second stage
        result.current.selectNode(fieldId);
      });

      const targetStage = result.current.getTargetStage();
      expect(targetStage).toBeDefined();
      expect(targetStage?.id).toBe(stageId); // First stage
    });

    it('returns stage when game inside stage is selected', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let gameId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        gameId = result.current.addGameNodeInStage(stageId).id;
        result.current.selectNode(gameId);
      });

      const targetStage = result.current.getTargetStage();
      expect(targetStage).toBeDefined();
      expect(targetStage?.id).toBe(stageId);
    });

    it('returns stage when team inside stage is selected', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let teamId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        teamId = result.current.addTeamNodeInStage(stageId).id;
        result.current.selectNode(teamId);
      });

      const targetStage = result.current.getTargetStage();
      expect(targetStage).toBeDefined();
      expect(targetStage?.id).toBe(stageId);
    });

    it('returns null when nothing is selected and no containers exist', () => {
      const { result } = renderHook(() => useFlowState());

      const targetStage = result.current.getTargetStage();
      expect(targetStage).toBeNull();
    });

    it('returns first stage of first field when nothing is selected but containers exist', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      const targetStage = result.current.getTargetStage();
      expect(targetStage).toBeDefined();
      expect(targetStage?.id).toBe(stageId);
    });
  });

  describe('ensureContainerHierarchy', () => {
    it('creates field and stage when none exist', () => {
      const { result } = renderHook(() => useFlowState());

      let hierarchy: { fieldId: string; stageId: string };
      act(() => {
        hierarchy = result.current.ensureContainerHierarchy();
      });

      expect(hierarchy!.fieldId).toBeDefined();
      expect(hierarchy!.stageId).toBeDefined();
      expect(result.current.nodes).toHaveLength(2);
      expect(isFieldNode(result.current.nodes[0])).toBe(true);
      expect(isStageNode(result.current.nodes[1])).toBe(true);
    });

    it('creates only stage when field exists but no stages', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      let hierarchy: { fieldId: string; stageId: string };
      act(() => {
        hierarchy = result.current.ensureContainerHierarchy();
      });

      expect(hierarchy!.fieldId).toBe(fieldId);
      expect(hierarchy!.stageId).toBeDefined();
      expect(result.current.nodes.filter(isStageNode)).toHaveLength(1);
    });

    it('returns existing field and stage when hierarchy exists', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      const initialNodeCount = result.current.nodes.length;

      let hierarchy: { fieldId: string; stageId: string };
      act(() => {
        hierarchy = result.current.ensureContainerHierarchy();
      });

      expect(hierarchy!.fieldId).toBe(fieldId);
      expect(hierarchy!.stageId).toBe(stageId);
      expect(result.current.nodes.length).toBe(initialNodeCount); // No new nodes
    });

    it('uses selected field for new stage creation', () => {
      const { result } = renderHook(() => useFlowState());

      let field1Id: string;
      let field2Id: string;
      let stage1Id: string;

      act(() => {
        field1Id = result.current.addFieldNode({ name: 'Field 1' }).id;
      });

      act(() => {
        stage1Id = result.current.addStageNode(field1Id)!.id;
      });

      act(() => {
        field2Id = result.current.addFieldNode({ name: 'Field 2' }).id;
      });

      act(() => {
        // Select field 2, which has no stages
        result.current.selectNode(field2Id);
      });

      let hierarchy: { fieldId: string; stageId: string };
      act(() => {
        hierarchy = result.current.ensureContainerHierarchy();
      });

      expect(hierarchy!.fieldId).toBe(field2Id);
      expect(hierarchy!.stageId).not.toBe(stage1Id); // New stage created
      // New stage should be in field 2
      const newStage = result.current.nodes.find(
        (n) => n.id === hierarchy!.stageId
      );
      expect(newStage?.parentId).toBe(field2Id);
    });
  });

  describe('addTeamNodeInStage', () => {
    it('creates team inside specified stage', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let teamId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        teamId = result.current.addTeamNodeInStage(stageId).id;
      });

      const team = result.current.nodes.find((n) => n.id === teamId);
      expect(team).toBeDefined();
      expect(team?.parentId).toBe(stageId);
      expect(isTeamNode(team!)).toBe(true);
    });

    it('creates team with custom reference', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      let teamId: string;
      act(() => {
        teamId = result.current.addTeamNodeInStage(stageId, {
          type: 'groupTeam',
          group: 1,
          team: 2,
        }).id;
      });

      const team = result.current.nodes.find((n) => n.id === teamId);
      expect(team?.data.reference).toEqual({ type: 'groupTeam', group: 1, team: 2 });
    });

    it('auto-creates container hierarchy when no stage provided', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;
      act(() => {
        teamId = result.current.addTeamNodeInStage().id;
      });

      expect(result.current.nodes).toHaveLength(3); // field, stage, team
      const team = result.current.nodes.find((n) => n.id === teamId);
      expect(team?.parentId).toBeDefined();

      const parentStage = result.current.nodes.find((n) => n.id === team?.parentId);
      expect(isStageNode(parentStage!)).toBe(true);
    });

    it('stacks teams vertically inside stage', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      let team1Id: string;
      let team2Id: string;

      act(() => {
        team1Id = result.current.addTeamNodeInStage(stageId).id;
      });

      act(() => {
        team2Id = result.current.addTeamNodeInStage(stageId).id;
      });

      const team1 = result.current.nodes.find((n) => n.id === team1Id);
      const team2 = result.current.nodes.find((n) => n.id === team2Id);

      // Teams should have different Y positions (stacked)
      expect(team2!.position.y).toBeGreaterThan(team1!.position.y);
    });
  });

  describe('addGameNodeInStage - position calculation', () => {
    it('positions games to the right of teams in stage', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      let teamId: string;
      let gameId: string;
      act(() => {
        teamId = result.current.addTeamNodeInStage(stageId).id;
        gameId = result.current.addGameNodeInStage(stageId).id;
      });

      const team = result.current.nodes.find((n) => n.id === teamId);
      const game = result.current.nodes.find((n) => n.id === gameId);

      // Games should be positioned to the right of teams
      expect(game!.position.x).toBeGreaterThan(team!.position.x);
    });
  });

  describe('toolbar integration - handleAddTeam uses container hierarchy', () => {
    it('addTeamNode (legacy) still works for backward compatibility', () => {
      const { result } = renderHook(() => useFlowState());

      act(() => {
        result.current.addTeamNode();
      });

      // Legacy addTeamNode creates free-floating team
      const team = result.current.nodes[0];
      expect(isTeamNode(team)).toBe(true);
      expect(team.parentId).toBeUndefined();
    });
  });

  describe('getTeamStage helper', () => {
    it('returns parent stage of a team', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let teamId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        teamId = result.current.addTeamNodeInStage(stageId).id;
      });

      const stage = result.current.getTeamStage(teamId);
      expect(stage).toBeDefined();
      expect(stage?.id).toBe(stageId);
    });

    it('returns null for team without parent stage', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;
      act(() => {
        teamId = result.current.addTeamNode().id;
      });

      const stage = result.current.getTeamStage(teamId);
      expect(stage).toBeNull();
    });
  });

  describe('getTeamField helper', () => {
    it('returns parent field of a team', () => {
      const { result } = renderHook(() => useFlowState());

      let fieldId: string;
      let stageId: string;
      let teamId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stageId = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        teamId = result.current.addTeamNodeInStage(stageId).id;
      });

      const field = result.current.getTeamField(teamId);
      expect(field).toBeDefined();
      expect(field?.id).toBe(fieldId);
    });

    it('returns null for team without valid hierarchy', () => {
      const { result } = renderHook(() => useFlowState());

      let teamId: string;
      act(() => {
        teamId = result.current.addTeamNode().id;
      });

      const field = result.current.getTeamField(teamId);
      expect(field).toBeNull();
    });
  });

  describe('moveNodeToStage', () => {
    it('moves team to different stage', () => {
      const { result } = renderHook(() => useFlowState());

      let stage1Id: string;
      let stage2Id: string;
      let teamId: string;
      let fieldId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stage1Id = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        stage2Id = result.current.addStageNode(fieldId)!.id;
        teamId = result.current.addTeamNodeInStage(stage1Id).id;
      });

      expect(result.current.nodes.find((n) => n.id === teamId)?.parentId).toBe(stage1Id);

      act(() => {
        result.current.moveNodeToStage(teamId, stage2Id);
      });

      expect(result.current.nodes.find((n) => n.id === teamId)?.parentId).toBe(stage2Id);
    });

    it('moves game to different stage', () => {
      const { result } = renderHook(() => useFlowState());

      let stage1Id: string;
      let stage2Id: string;
      let gameId: string;
      let fieldId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stage1Id = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        stage2Id = result.current.addStageNode(fieldId)!.id;
        gameId = result.current.addGameNodeInStage(stage1Id).id;
      });

      act(() => {
        result.current.moveNodeToStage(gameId, stage2Id);
      });

      expect(result.current.nodes.find((n) => n.id === gameId)?.parentId).toBe(stage2Id);
    });

    it('recalculates position after moving', () => {
      const { result } = renderHook(() => useFlowState());

      let stage1Id: string;
      let stage2Id: string;
      let team1Id: string;
      let fieldId: string;

      act(() => {
        fieldId = result.current.addFieldNode().id;
      });

      act(() => {
        stage1Id = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        stage2Id = result.current.addStageNode(fieldId)!.id;
      });

      act(() => {
        team1Id = result.current.addTeamNodeInStage(stage1Id).id;
        // Add existing team to stage2
        result.current.addTeamNodeInStage(stage2Id);
      });

      const positionBeforeMove = result.current.nodes.find((n) => n.id === team1Id)?.position;

      act(() => {
        result.current.moveNodeToStage(team1Id, stage2Id);
      });

      const positionAfterMove = result.current.nodes.find((n) => n.id === team1Id)?.position;

      // Position should change after moving to a stage with existing nodes
      expect(positionAfterMove).not.toEqual(positionBeforeMove);
    });
  });
});
