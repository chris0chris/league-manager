import type { FlowNode, GameNode, GlobalTeam } from '../types/flowchart';
import { isGameNode } from '../types/flowchart';

/**
 * Resolves winner/loser references in game nodes based on current scores.
 * 
 * @param nodes - All nodes in the flowchart
 * @param teams - All global teams for name lookup
 * @returns Updated nodes with resolved team names
 */
export function resolveBracketReferences(nodes: FlowNode[], teams: GlobalTeam[]): FlowNode[] {
  if (!Array.isArray(nodes) || !Array.isArray(teams)) return nodes || [];
  const teamMap = new Map<string, string>();
  teams.forEach(t => teamMap.set(t.id, t.label));

  const resolveTeam = (ref: { type: string; matchName: string } | null, currentNodes: FlowNode[]): string | null => {
    if (!ref || !ref.matchName) return null;

    // Find the referenced game
    const sourceNode = currentNodes.find(n => 
      isGameNode(n) && n.data.standing === ref.matchName
    ) as GameNode | undefined;

    if (!sourceNode) return null;

    const { final_score, status, homeTeamId, awayTeamId, resolvedHomeTeam, resolvedAwayTeam } = sourceNode.data;
    
    // Game must be completed to resolve winner/loser
    const isCompleted = status === 'COMPLETED' || status === 'Beendet';
    if (!isCompleted || !final_score) {
      console.log(`[Bracket] ${ref.matchName} not completed or no score. Status: ${status}`);
      return null;
    }

    const hTotal = final_score.home || 0;
    const aTotal = final_score.away || 0;

    if (hTotal === aTotal) {
      console.log(`[Bracket] ${ref.matchName} is a Tie`);
      return 'Tie';
    }

    const isHomeWinner = hTotal > aTotal;
    const wantWinner = ref.type === 'winner';
    let result: string | null;

    if (wantWinner) {
      result = isHomeWinner ? 
        (resolvedHomeTeam || teamMap.get(homeTeamId || '') || homeTeamId || 'TBD') : 
        (resolvedAwayTeam || teamMap.get(awayTeamId || '') || awayTeamId || 'TBD');
    } else {
      result = isHomeWinner ? 
        (resolvedAwayTeam || teamMap.get(awayTeamId || '') || awayTeamId || 'TBD') : 
        (resolvedHomeTeam || teamMap.get(homeTeamId || '') || homeTeamId || 'TBD');
    }
    console.log(`[Bracket] Resolved ${ref.type} of ${ref.matchName} to ${result}`);
    return result;
  };

  // Perform up to 3 passes to handle nested references (SF -> Final)
  let updatedNodes = [...nodes];
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    updatedNodes = updatedNodes.map(node => {
      if (!isGameNode(node)) return node;

      const newResolvedHome = resolveTeam(node.data.homeTeamDynamic, updatedNodes);
      const newResolvedAway = resolveTeam(node.data.awayTeamDynamic, updatedNodes);

      if (newResolvedHome !== node.data.resolvedHomeTeam || newResolvedAway !== node.data.resolvedAwayTeam) {
        changed = true;
        return {
          ...node,
          data: {
            ...node.data,
            resolvedHomeTeam: newResolvedHome || undefined,
            resolvedAwayTeam: newResolvedAway || undefined
          }
        };
      }
      return node;
    });
    if (!changed) break;
  }

  return updatedNodes;
}

(window as unknown as { resolveBracketReferences: typeof resolveBracketReferences }).resolveBracketReferences = resolveBracketReferences;

