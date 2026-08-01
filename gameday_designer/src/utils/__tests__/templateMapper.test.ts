import { describe, it, expect } from 'vitest';
import { genericizeFlowState, applyGenericTemplate } from '../templateMapper';
import {
  FlowState,
  GlobalTeam,
  GlobalTeamGroup,
  FlowNode,
  isGameNode,
  createFieldNode,
  createStageNode,
  createGameNodeInStage,
} from '../../types/flowchart';

describe('templateMapper', () => {
  it('should correctly genericize teams into group and team indices', () => {
    const groups: GlobalTeamGroup[] = [
      { id: 'g1', name: 'Group A', order: 0 },
      { id: 'g2', name: 'Group B', order: 1 },
    ];
    const teams: GlobalTeam[] = [
      { id: 't1', label: 'Team 1', groupId: 'g1', order: 0 },
      { id: 't2', label: 'Team 2', groupId: 'g1', order: 1 },
      { id: 't3', label: 'Team 3', groupId: 'g2', order: 0 },
    ];
    
    const nodes: FlowNode[] = [
      {
        id: 'game-1',
        type: 'game',
        position: { x: 0, y: 0 },
        data: {
          stage: 'Preliminary',
          stageType: 'STANDARD' as const,
          standing: 'A1',
          homeTeamId: 't1', // Group 0, Team 0
          awayTeamId: 't2', // Group 0, Team 1
          official: { type: 'static', name: 't3' }, // Group 1, Team 0
          breakAfter: 0,
        }
      } as FlowNode,
    ];

    const flowState: Partial<FlowState> = {
      nodes,
      edges: [],
      globalTeams: teams,
      globalTeamGroups: groups,
    };

    const template = genericizeFlowState(flowState as FlowState, "Test Template");
    
    expect(template.num_teams).toBe(3);
    expect(template.slots[0].home_group).toBe(0);
    expect(template.slots[0].home_team).toBe(0);
    expect(template.slots[0].away_group).toBe(0);
    expect(template.slots[0].away_team).toBe(1);
    expect(template.slots[0].official_group).toBe(1);
    expect(template.slots[0].official_team).toBe(0);
  });

  it('should serialize startTime and manualTime into slots', () => {
    const groups: GlobalTeamGroup[] = [{ id: 'g1', name: 'Group A', order: 0 }];
    const teams: GlobalTeam[] = [
      { id: 't1', label: 'Team 1', groupId: 'g1', order: 0 },
      { id: 't2', label: 'Team 2', groupId: 'g1', order: 1 },
    ];
    const nodes: FlowNode[] = [
      {
        id: 'game-1', type: 'game', position: { x: 0, y: 0 },
        data: { stage: 'Preliminary', stageType: 'STANDARD', standing: 'A1', homeTeamId: 't1', awayTeamId: 't2', official: null, breakAfter: 0, startTime: '10:30', manualTime: true }
      } as FlowNode,
    ];
    const flowState = { nodes, edges: [], globalTeams: teams, globalTeamGroups: groups } as unknown as FlowState;

    const template = genericizeFlowState(flowState, 'Times Test');

    expect(template.slots[0].start_time).toBe('10:30');
    expect(template.slots[0].manual_time).toBe(true);
  });

  it('should restore official, startTime, and manualTime when applying a template', () => {
    const groups: GlobalTeamGroup[] = [
      { id: 'g1', name: 'Group A', order: 0 },
      { id: 'g2', name: 'External Officials', order: 1 },
    ];
    const teams: GlobalTeam[] = [
      { id: 't1', label: 'Team 1', groupId: 'g1', order: 0 },
      { id: 't2', label: 'Team 2', groupId: 'g1', order: 1 },
      { id: 'off1', label: 'Ref A', groupId: 'g2', order: 0 },
    ];

    const template = {
      name: 'Test', description: '', num_teams: 3, num_fields: 1, num_groups: 2,
      game_duration: 15, sharing: 'PRIVATE' as const,
      group_config: [{ name: 'Group A', team_count: 2 }, { name: 'External Officials', team_count: 1 }],
      slots: [{
        field: 1, slot_order: 1, stage: 'Preliminary', stage_type: 'STANDARD' as const,
        stage_category: 'preliminary' as const, standing: 'A1', break_after: 0,
        home_group: 0, home_team: 0, home_reference: '',
        away_group: 0, away_team: 1, away_reference: '',
        official_group: 1, official_team: 0, official_reference: '',
        start_time: '09:30', manual_time: true,
      }],
    };

    const currentState: FlowState = {
      nodes: [], edges: [], globalTeams: teams, globalTeamGroups: groups,
      metadata: null,
    } as unknown as FlowState;

    const result = applyGenericTemplate(template, currentState);

    const gameNode = result.nodes.filter(isGameNode)[0];
    expect(gameNode).toBeDefined();
    expect(gameNode.data.official).not.toBeNull();
    expect(gameNode.data.official?.type).toBe('static');
    // The official should reference the team in g2 (External Officials), index 0
    const officialTeamId = (gameNode.data.official as { name: string }).name;
    const officialTeam = result.globalTeams.find(t => t.id === officialTeamId);
    expect(officialTeam).toBeDefined();
    expect(officialTeam?.groupId).toBe(groups[1].id); // g2 = External Officials
    expect(gameNode.data.startTime).toBe('09:30');
    expect(gameNode.data.manualTime).toBe(true);
  });

  it('derives num_fields and per-slot field index from the field container nodes, not the legacy fields metadata array', () => {
    // Reproduces production bug: gamedays built via the "Add Field" designer button
    // (nodesManager.addFieldNode) never populate the separate `fields` metadata array,
    // so it stays empty even though real field container nodes exist in `nodes`.
    const groups: GlobalTeamGroup[] = [{ id: 'g1', name: 'Group A', order: 0 }];
    const teams: GlobalTeam[] = [
      { id: 't1', label: 'Team 1', groupId: 'g1', order: 0 },
      { id: 't2', label: 'Team 2', groupId: 'g1', order: 1 },
      { id: 't3', label: 'Team 3', groupId: 'g1', order: 2 },
      { id: 't4', label: 'Team 4', groupId: 'g1', order: 3 },
    ];

    const field1 = createFieldNode('field-1', { name: 'Feld 1', order: 0 });
    const field2 = createFieldNode('field-2', { name: 'Feld 2', order: 1 });
    const stage1 = createStageNode('stage-1', field1.id, { name: 'Preliminary', order: 0 });
    const stage2 = createStageNode('stage-2', field2.id, { name: 'Preliminary', order: 0 });
    const game1 = createGameNodeInStage('game-1', stage1.id, {
      standing: 'A1', homeTeamId: 't1', awayTeamId: 't2', official: null, breakAfter: 0,
    });
    const game2 = createGameNodeInStage('game-2', stage2.id, {
      standing: 'B1', homeTeamId: 't3', awayTeamId: 't4', official: null, breakAfter: 0,
    });

    const nodes: FlowNode[] = [field1, field2, stage1, stage2, game1, game2];

    const flowState = { nodes, edges: [], globalTeams: teams, globalTeamGroups: groups } as unknown as FlowState;

    const template = genericizeFlowState(flowState, 'Multi-Field Test');

    expect(template.num_fields).toBe(2);
    const fieldByStanding = new Map(template.slots.map(s => [s.standing, s.field]));
    expect(fieldByStanding.get('A1')).toBe(1);
    expect(fieldByStanding.get('B1')).toBe(2);
  });

  describe('unresolvable winner/loser references', () => {
    const groups: GlobalTeamGroup[] = [{ id: 'g1', name: 'Group A', order: 0 }];
    const teams: GlobalTeam[] = [
      { id: 't1', label: 'Team 1', groupId: 'g1', order: 0 },
      { id: 't2', label: 'Team 2', groupId: 'g1', order: 1 },
    ];

    const baseSlot = {
      field: 1, slot_order: 1, stage: 'Preliminary', stage_type: 'STANDARD' as const,
      stage_category: 'preliminary' as const, break_after: 0,
      home_group: 0, home_team: 0, home_reference: '',
      away_group: 0, away_team: 1, away_reference: '',
      official_group: null, official_team: null, official_reference: '',
      start_time: '', manual_time: false,
    };

    it('wires an edge and keeps the dynamic reference when the source standing exists', () => {
      const template = {
        name: 'Test', description: '', num_teams: 2, num_fields: 1, num_groups: 1,
        game_duration: 15, sharing: 'PRIVATE' as const,
        slots: [
          { ...baseSlot, slot_order: 1, standing: 'AF 1' },
          { ...baseSlot, slot_order: 2, standing: 'VF 1', home_reference: 'Winner AF 1', home_group: null, home_team: null },
        ],
      };
      const currentState: FlowState = {
        nodes: [], edges: [], globalTeams: teams, globalTeamGroups: groups, metadata: null,
      } as unknown as FlowState;

      const result = applyGenericTemplate(template, currentState);

      const vf1 = result.nodes.filter(isGameNode).find(n => n.data.standing === 'VF 1')!;
      expect(vf1.data.homeTeamDynamic).toEqual({ type: 'winner', matchName: 'AF 1' });
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].targetHandle).toBe('home');
    });

    it('clears the dynamic reference instead of leaving a dangling matchName when the source standing does not exist', () => {
      // Reproduces production bug (gameday 898, stage): a template slot's
      // home_reference pointed at a standing ("Game 1") that doesn't match any
      // slot's own `standing` in the same template. No edge could be wired,
      // but homeTeamDynamic was set unconditionally regardless - so the
      // canvas showed the slot as unassigned while export still emitted
      // "Gewinner Game 1" for a match that doesn't exist anywhere.
      const template = {
        name: 'Test', description: '', num_teams: 2, num_fields: 1, num_groups: 1,
        game_duration: 15, sharing: 'PRIVATE' as const,
        slots: [
          { ...baseSlot, slot_order: 1, standing: 'VF 1', home_reference: 'Winner Game 1', home_group: null, home_team: null },
        ],
      };
      const currentState: FlowState = {
        nodes: [], edges: [], globalTeams: teams, globalTeamGroups: groups, metadata: null,
      } as unknown as FlowState;

      const result = applyGenericTemplate(template, currentState);

      const vf1 = result.nodes.filter(isGameNode).find(n => n.data.standing === 'VF 1')!;
      expect(vf1.data.homeTeamDynamic).toBeNull();
      expect(result.edges.filter(e => e.targetHandle === 'home')).toHaveLength(0);
    });
  });
});
