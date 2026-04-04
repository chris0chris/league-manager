import { FlowState, GlobalTeam, FlowNode, isGameNode, isStageNode, createGameNodeInStage, createGameToGameEdge, createStageToGameEdge, FlowEdge, GlobalTeamGroup, StageCategory, StageToGameEdgeData } from '../types/flowchart';
import { isWinnerReference, isLoserReference, isGroupTeamReference, isRankReference, isGroupRankReference, TeamReference } from '../types/designer';
import { v4 as uuidv4 } from 'uuid';

export interface GenericTemplateSlot {
  field: number;
  slot_order: number;
  stage: string;
  stage_type: 'STANDARD' | 'RANKING';
  stage_category: StageCategory;
  standing: string;
  home_group?: number;
  home_team?: number;
  home_reference?: string;
  away_group?: number;
  away_team?: number;
  away_reference?: string;
  official_group?: number;
  official_team?: number;
  official_reference?: string;
  break_after: number;
  start_time?: string;
  manual_time?: boolean;
  update_rule?: {
    pre_finished: string;
    team_rules: Array<{
      role: 'home' | 'away' | 'official';
      standing: string;
      place: number;
    }>;
  };
}

export interface GenericTemplate {
  id?: number | string;
  name: string;
  description: string;
  num_teams: number;
  num_fields: number;
  num_groups: number;
  game_duration: number;
  sharing: 'PRIVATE' | 'ASSOCIATION' | 'GLOBAL';
  slots: GenericTemplateSlot[];
  group_config?: Array<{ name: string, team_count: number }>;
}

export function genericizeFlowState(state: FlowState, name: string, description: string = '', sharing: 'PRIVATE' | 'ASSOCIATION' | 'GLOBAL' = 'ASSOCIATION'): GenericTemplate {
  const groups = [...state.globalTeamGroups].sort((a, b) => a.order - b.order);
  const teamsInGroups = groups.map(group =>
    state.globalTeams.filter(t => t.groupId === group.id).sort((a, b) => a.order - b.order)
  );

  const resolveTeam = (teamId: string | null, dynamicRef: unknown) => {
    if (dynamicRef) {
      if (isWinnerReference(dynamicRef)) return { reference: `Winner ${dynamicRef.matchName}` };
      if (isLoserReference(dynamicRef)) return { reference: `Loser ${dynamicRef.matchName}` };
      if (isGroupTeamReference(dynamicRef)) return { group: dynamicRef.group, team: dynamicRef.team };
      if (isGroupRankReference(dynamicRef)) return { reference: `Rank ${dynamicRef.place} ${dynamicRef.groupName} from ${dynamicRef.stageName}` };
      if (isRankReference(dynamicRef)) return { reference: `Rank ${dynamicRef.place} from ${dynamicRef.stageName}` };
    }

    if (teamId) {
      const team = state.globalTeams.find(t => t.id === teamId);
      if (team && team.groupId) {
        const groupIdx = groups.findIndex(g => g.id === team.groupId);
        const teamIdx = teamsInGroups[groupIdx].findIndex(t => t.id === team.id);
        if (groupIdx !== -1 && teamIdx !== -1) {
          return { group: groupIdx, team: teamIdx };
        }
      }
    }
    return {};
  };

  // Resolve team assignment from an edge when dynamicRef/teamId are both absent
  const resolveTeamFromEdge = (gameId: string, targetHandle: 'home' | 'away'): { reference?: string } => {
    const edge = state.edges.find(e =>
      e.target === gameId && e.targetHandle === targetHandle
    );
    if (!edge) return {};

    const srcNode = state.nodes.find(n => n.id === edge.source);
    if (!srcNode) return {};

    if (edge.type === 'gameToGame' && isGameNode(srcNode)) {
      const prefix = edge.sourceHandle === 'loser' ? 'Loser' : 'Winner';
      return { reference: `${prefix} ${srcNode.data.standing}` };
    }

    if (edge.type === 'stageToGame' && isStageNode(srcNode)) {
      // Data is in edge.data for stageToGame
      const { sourceRank, sourceGroup } = edge.data as StageToGameEdgeData;
      if (sourceGroup) {
        return { reference: `Rank ${sourceRank} ${sourceGroup} from ${srcNode.data.name}` };
      }
      return { reference: `Rank ${sourceRank} from ${srcNode.data.name}` };
    }

    return {};
  };

  const hasValue = (resolved: { group?: number; team?: number; reference?: string }): boolean =>
    resolved.group !== undefined || (resolved.reference !== undefined && resolved.reference !== '');

  const resolveOfficial = (official: { type?: string; name?: string; matchName?: string } | null | undefined) => {
    if (!official) return {};
    if (official.type === 'static') {
        const team = state.globalTeams.find(t => t.label === official.name || t.id === official.name);
        if (team && team.groupId) {
            const groupIdx = groups.findIndex(g => g.id === team.groupId);
            const teamIdx = teamsInGroups[groupIdx].findIndex(t => t.id === team.id);
            if (groupIdx !== -1 && teamIdx !== -1) {
                return { group: groupIdx, team: teamIdx };
            }
        }
        return { reference: official.name };
    }
    if (official.type === 'winner') return { reference: `Winner ${official.matchName}` };
    if (official.type === 'loser') return { reference: `Loser ${official.matchName}` };
    return {};
  };

  const gameNodes = state.nodes.filter(isGameNode);
  const fieldsList = [...state.fields].sort((a, b) => a.order - b.order);

  const slots: GenericTemplateSlot[] = gameNodes.map(node => {
    // Derive stage name, type, and category from the parent stage node.
    const parentNode = state.nodes.find(n => n.id === node.parentId);
    const stageNode = parentNode && isStageNode(parentNode) ? parentNode : null;
    const stageName = stageNode ? stageNode.data.name : node.data.stage;
    const stageType = stageNode ? (stageNode.data.stageType ?? 'STANDARD') : node.data.stageType;
    const stageCategory = stageNode ? (stageNode.data.category ?? 'preliminary') : 'preliminary';

    // Derive field number from the stage's parent field node.
    let fieldNum = 1;
    if (stageNode?.parentId) {
      const fieldNode = state.nodes.find(n => n.id === stageNode.parentId);
      if (fieldNode) {
        const fieldIdx = fieldsList.findIndex(f => f.id === fieldNode.id);
        fieldNum = fieldIdx !== -1 ? fieldIdx + 1 : 1;
      }
    }

    let home = resolveTeam(node.data.homeTeamId, node.data.homeTeamDynamic);
    let away = resolveTeam(node.data.awayTeamId, node.data.awayTeamDynamic);

    // Fall back to edge-based resolution for TBD progression slots
    if (!hasValue(home)) home = resolveTeamFromEdge(node.id, 'home');
    if (!hasValue(away)) away = resolveTeamFromEdge(node.id, 'away');

    const official = resolveOfficial(node.data.official);

    return {
      field: fieldNum,
      slot_order: 1,
      stage: stageName,
      stage_type: stageType,
      stage_category: stageCategory,
      standing: node.data.standing,
      home_group: home.group,
      home_team: home.team,
      home_reference: home.reference || '',
      away_group: away.group,
      away_team: away.team,
      away_reference: away.reference || '',
      official_group: official.group,
      official_team: official.team,
      official_reference: official.reference || '',
      break_after: node.data.breakAfter || 0,
      start_time: node.data.startTime,
      manual_time: node.data.manualTime || false,
    };
  });

  const sortedSlots = slots.sort((a, b) => {
      if (a.field !== b.field) return a.field - b.field;
      return a.standing.localeCompare(b.standing);
  });

  let currentField = -1;
  let currentOrder = 0;
  sortedSlots.forEach(slot => {
      if (slot.field !== currentField) {
          currentField = slot.field;
          currentOrder = 1;
      } else {
          currentOrder++;
      }
      slot.slot_order = currentOrder;
  });

  const group_config = groups.map((g, idx) => ({
    name: g.name,
    team_count: teamsInGroups[idx].length
  }));

  return {
    name,
    description,
    num_teams: state.globalTeams.length,
    num_fields: state.fields.length,
    num_groups: state.globalTeamGroups.length,
    game_duration: state.metadata?.game_duration || 70,
    sharing,
    slots: sortedSlots,
    group_config,
  };
}

/**
 * Apply a generic template to a gameday designer state.
 * Scaffolds teams and groups if missing.
 */
export function applyGenericTemplate(template: GenericTemplate, currentState: FlowState): {
  nodes: FlowNode[],
  edges: FlowEdge[],
  globalTeams: GlobalTeam[],
  globalTeamGroups: GlobalTeamGroup[]
} {
  const newNodes: FlowNode[] = [];
  const newEdges: FlowEdge[] = [];
  const newGroups = [...currentState.globalTeamGroups];
  const newTeams = [...currentState.globalTeams];

  // 1. Scaffold groups if missing
  if (newGroups.length === 0 && template.group_config) {
    template.group_config.forEach((config, idx) => {
      newGroups.push({
        id: `g${idx + 1}`,
        name: config.name,
        order: idx
      });
    });
  } else if (newGroups.length < template.num_groups) {
    for (let i = newGroups.length; i < template.num_groups; i++) {
      newGroups.push({
        id: `g${i + 1}`,
        name: `Gruppe ${String.fromCharCode(65 + i)}`,
        order: i
      });
    }
  }

  // Helper to get actual team ID from group/team index
  const getTeamId = (groupIdx: number | undefined, teamIdx: number | undefined): string | null => {
    if (groupIdx === undefined || teamIdx === undefined) return null;
    const group = newGroups[groupIdx];
    if (!group) return null;
    const teamsInGroup = newTeams.filter(t => t.groupId === group.id).sort((a, b) => a.order - b.order);
    return teamsInGroup[teamIdx]?.id || null;
  };

  // 2. Create Field and Stage nodes
  const fieldsNodes: FlowNode[] = [];
  for (let i = 1; i <= template.num_fields; i++) {
    const fieldId = `field-${i}`;
    fieldsNodes.push({
      id: fieldId,
      type: 'field',
      position: { x: (i - 1) * 400, y: 0 },
      data: { name: `Feld ${i}`, order: i - 1, color: '#007bff' }
    } as FlowNode);
  }
  newNodes.push(...fieldsNodes);

  const stagesMap = new Map<string, string>();

  // 3. Create Game nodes — topologically sorted so source games precede their dependents.
  //    Alphabetical sort (used by genericizeFlowState) puts "Final" and "3rd Place" before
  //    "SF1"/"SF2", which would create the Playoffs stage first (order=0) and push SF nodes
  //    AFTER Final in allNodes.  GameTable.getEligibleSourceGames relies on allNodes index
  //    within the same stage, so SF1 would appear ineligible as a source for Final.
  //    Topological sort ensures: group-stage games first, then SF1/SF2, then Final/3rd-Place.
  const topoSortedSlots = (() => {
    const byStanding = new Map(template.slots.map(s => [s.standing, s]));

    // Extract the standing that a winner/loser reference points to (null if not a game ref)
    const refTarget = (ref?: string): string | null => {
      if (!ref) return null;
      const m = ref.match(/^(?:Winner|Loser) (.+)$/);
      return m && byStanding.has(m[1]) ? m[1] : null;
    };

    // Kahn's algorithm: build in-degree and reverse-dependency maps
    const inDegree = new Map<string, number>(template.slots.map(s => [s.standing, 0]));
    const rdeps = new Map<string, string[]>(); // standing → standings that depend on it

    for (const slot of template.slots) {
      for (const ref of [slot.home_reference, slot.away_reference]) {
        const target = refTarget(ref);
        if (target) {
          inDegree.set(slot.standing, (inDegree.get(slot.standing) ?? 0) + 1);
          rdeps.set(target, [...(rdeps.get(target) ?? []), slot.standing]);
        }
      }
    }

    const queue: GenericTemplateSlot[] = template.slots.filter(
      s => inDegree.get(s.standing) === 0
    );
    // Stable tie-break: lower field first, then alphabetical standing
    queue.sort((a, b) => a.field !== b.field ? a.field - b.field : a.standing.localeCompare(b.standing));

    const out: GenericTemplateSlot[] = [];
    while (queue.length) {
      const slot = queue.shift()!;
      out.push(slot);
      for (const dep of (rdeps.get(slot.standing) ?? [])) {
        const newDeg = (inDegree.get(dep) ?? 0) - 1;
        inDegree.set(dep, newDeg);
        if (newDeg === 0) {
          const depSlot = byStanding.get(dep)!;
          // Insert in sorted position (field asc, then standing asc) for stable output
          let i = queue.length;
          while (i > 0) {
            const prev = queue[i - 1];
            if (prev.field < depSlot.field || (prev.field === depSlot.field && prev.standing.localeCompare(depSlot.standing) <= 0)) break;
            i--;
          }
          queue.splice(i, 0, depSlot);
        }
      }
    }

    // Append any remaining slots (e.g. cycles or rank-only references)
    for (const slot of template.slots) {
      if (!out.includes(slot)) out.push(slot);
    }
    return out;
  })();

  topoSortedSlots.forEach((slot) => {
    const fieldNode = fieldsNodes[slot.field - 1] || fieldsNodes[0];
    const stageKey = `${slot.field}-${slot.stage}`;

    let stageId = stagesMap.get(stageKey);
    if (!stageId) {
      stageId = `stage-${uuidv4().slice(0, 8)}`;
      stagesMap.set(stageKey, stageId);
      newNodes.push({
        id: stageId,
        type: 'stage',
        parentId: fieldNode.id,
        position: { x: 20, y: 60 },
        data: {
          type: 'stage',
          name: slot.stage,
          order: stagesMap.size - 1,
          stageType: slot.stage_type,
          category: slot.stage_category || 'preliminary',
        }
      } as FlowNode);
    }

    const homeTeamId = getTeamId(slot.home_group, slot.home_team);
    const awayTeamId = getTeamId(slot.away_group, slot.away_team);

    // Restore official: prefer group/team index lookup, fall back to reference string
    let official: TeamReference | null = null;
    const officialTeamId = getTeamId(slot.official_group, slot.official_team);
    if (officialTeamId) {
      official = { type: 'static', name: officialTeamId };
    } else if (slot.official_reference) {
      const parsed = parseReference(slot.official_reference, newNodes);
      official = parsed ? (parsed as TeamReference) : { type: 'static', name: slot.official_reference };
    }

    const gameNode = createGameNodeInStage(
      `game-${uuidv4().slice(0, 8)}`,
      stageId,
      {
        stage: slot.stage,
        stageType: slot.stage_type,
        standing: slot.standing,
        homeTeamId: homeTeamId || undefined,
        awayTeamId: awayTeamId || undefined,
        homeTeamDynamic: slot.home_reference ? parseReference(slot.home_reference, newNodes) : undefined,
        awayTeamDynamic: slot.away_reference ? parseReference(slot.away_reference, newNodes) : undefined,
        official: official,
        breakAfter: slot.break_after,
        startTime: slot.start_time,
        manualTime: slot.manual_time,
      }
    );
    newNodes.push(gameNode);
  });

  // 4. Rebuild all edges from dynamic references
  const allGameNodes = newNodes.filter(isGameNode);
  for (const targetGame of allGameNodes) {
    for (const slot of ['home', 'away'] as const) {
      const dynamicRef = slot === 'home'
        ? targetGame.data.homeTeamDynamic
        : targetGame.data.awayTeamDynamic;
      if (!dynamicRef) continue;

      if (isWinnerReference(dynamicRef) || isLoserReference(dynamicRef)) {
        const sourceGame = allGameNodes.find(g => g.data.standing === dynamicRef.matchName);
        if (sourceGame) {
          newEdges.push(createGameToGameEdge(
            uuidv4(),
            sourceGame.id,
            dynamicRef.type,
            targetGame.id,
            slot
          ));
        }
      } else if (isRankReference(dynamicRef) || isGroupRankReference(dynamicRef)) {
        const sourceStage = newNodes.find(n => isStageNode(n) && n.id === dynamicRef.stageId);
        if (sourceStage) {
          newEdges.push(createStageToGameEdge(
            uuidv4(),
            sourceStage.id,
            dynamicRef.place,
            targetGame.id,
            slot,
            isGroupRankReference(dynamicRef) ? dynamicRef.groupName : undefined
          ));
        }
      }
    }
  }

  return {
    nodes: newNodes,
    edges: newEdges,
    globalTeams: newTeams,
    globalTeamGroups: newGroups,
  };
}

/**
 * Parse a reference string back into a TeamReference object.
 * Needs all nodes to resolve stage names to stage IDs.
 */
function parseReference(ref: string, nodes: FlowNode[]) {
    if (ref.startsWith('Winner ')) {
        return { type: 'winner' as const, matchName: ref.replace('Winner ', '') };
    }
    if (ref.startsWith('Loser ')) {
        return { type: 'loser' as const, matchName: ref.replace('Loser ', '') };
    }
    
    // Rank formats:
    // Rank {place} from {stageName}
    // Rank {place} {groupName} from {stageName}
    const rankMatch = ref.match(/^Rank (\d+)(?: (.*?))? from (.*)$/);
    if (rankMatch) {
        const place = parseInt(rankMatch[1], 10);
        const groupName = rankMatch[2];
        const stageName = rankMatch[3];
        
        // Find stage node by name
        const stageNode = nodes.find(n => isStageNode(n) && n.data.name === stageName);
        if (stageNode) {
            if (groupName) {
                return {
                    type: 'groupRank' as const,
                    place,
                    groupName,
                    stageId: stageNode.id,
                    stageName: stageNode.data.name
                };
            }
            return {
                type: 'rank' as const,
                place,
                stageId: stageNode.id,
                stageName: stageNode.data.name
            };
        }
    }
    
    return undefined;
}
