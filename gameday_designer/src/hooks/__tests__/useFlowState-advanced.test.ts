import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowState } from '../useFlowState';
import type { FlowState, GameNode } from '../../types/flowchart';

describe('useFlowState advanced', () => {
  it('migrates legacy teams during importState', () => {
    const { result } = renderHook(() => useFlowState());
    
    const legacyState = {
      globalTeams: [
        { id: 't1', label: 'Legacy Team', reference: 'ref1', order: 0 }
      ]
    } as unknown as FlowState;

    act(() => {
      result.current.importState(legacyState);
    });

    expect(result.current.globalTeams[0]).toMatchObject({
      id: 't1',
      label: 'Legacy Team',
      groupId: null,
      order: 0
    });
    expect(result.current.globalTeams[0]).not.toHaveProperty('reference');
  });

  it('cleans up dynamic references when source node is deleted', () => {
    const { result } = renderHook(() => useFlowState());
    
    let g1Id = '', g2Id = '';
    let fId = '', sId = '';
    act(() => {
      fId = result.current.addFieldNode().id;
    });
    act(() => {
      sId = result.current.addStageNode(fId)!.id;
    });
    act(() => {
      g1Id = result.current.addGameNodeInStage(sId).id;
      g2Id = result.current.addGameNodeInStage(sId).id;
    });

    act(() => {
      // Create edge between them
      result.current.addGameToGameEdge(g1Id, 'winner', g2Id, 'home');
    });

    // Verify initial state
    const g2Init = result.current.nodes.find(n => n.id === g2Id);
    expect(g2Init?.data.homeTeamDynamic).not.toBeNull();

    act(() => {
      result.current.deleteNode(g1Id);
    });

    const g2After = result.current.nodes.find(n => n.id === g2Id);
    expect(g2After?.data.homeTeamDynamic).toBeNull();
  });

  it('cascades deletion from field to stages and games', () => {
    const { result } = renderHook(() => useFlowState());
    
    let fId = '', sId = '';
    act(() => {
      fId = result.current.addFieldNode().id;
    });
    act(() => {
      sId = result.current.addStageNode(fId)!.id;
    });
    act(() => {
      result.current.addGameNodeInStage(sId);
    });

    expect(result.current.nodes).toHaveLength(3);

    act(() => {
      result.current.deleteNode(fId);
    });

    expect(result.current.nodes).toHaveLength(0);
  });

  it('provides hierarchy helpers', () => {
    const { result } = renderHook(() => useFlowState());
    
    let fId = '', sId = '', gId = '';
    act(() => {
      fId = result.current.addFieldNode().id;
    });
    act(() => {
      sId = result.current.addStageNode(fId)!.id;
    });
    act(() => {
      gId = result.current.addGameNodeInStage(sId).id;
    });

    expect(result.current.getGameField(gId)?.id).toBe(fId);
    expect(result.current.getGameStage(gId)?.id).toBe(sId);
    expect(result.current.getFieldStages(fId)).toHaveLength(1);
    expect(result.current.getStageGames(sId)).toHaveLength(1);
  });

  it('manages fields separately from nodes', () => {
    const { result } = renderHook(() => useFlowState());
    
    let fieldId = '';
    act(() => {
      const f = result.current.addField('New Field');
      fieldId = f.id;
    });

    expect(result.current.fields).toHaveLength(1);
    expect(result.current.fields[0].name).toBe('New Field');

    act(() => {
      result.current.updateField(fieldId, 'Updated');
    });
    expect(result.current.fields[0].name).toBe('Updated');

    act(() => {
      result.current.deleteField(fieldId);
    });
    expect(result.current.fields).toHaveLength(0);
  });

      it('addBulkGames adds nodes to the state', () => {
        const { result } = renderHook(() => useFlowState());
        
        act(() => {
          // @ts-expect-error - testing bulk add with partial objects
          result.current.addBulkGames([{ id: 'g1', type: 'game', data: {} } as unknown as GameNode]);
        });
  
        expect(result.current.nodes).toHaveLength(1);
      });});
