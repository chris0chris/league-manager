import { describe, it, expect } from 'vitest';
import { genericizeFlowState, applyGenericTemplate } from '../templateMapper';
import { FlowState, GlobalTeam, GlobalTeamGroup, FlowNode, isGameNode } from '../../types/flowchart';

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
      fields: [],
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
    const flowState = { nodes, edges: [], fields: [], globalTeams: teams, globalTeamGroups: groups } as unknown as FlowState;

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
      nodes: [], edges: [], fields: [], globalTeams: teams, globalTeamGroups: groups,
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
});
