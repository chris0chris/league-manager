/**
 * useTeamPoolState Hook
 *
 * Specialized hook for managing the global team pool and team groups:
 * - Team CRUD (add, update, delete, reorder)
 * - Group CRUD (add, update, delete, reorder)
 * - Team assignment tracking (usage)
 */

import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowNode,
  GameNodeData,
  GlobalTeam,
  GlobalTeamGroup,
} from '../types/flowchart';
import { isGameNode } from '../types/flowchart';
import { TEAM_COLORS } from '../utils/tournamentConstants';

export function useTeamPoolState(
  globalTeams: GlobalTeam[],
  setGlobalTeams: React.Dispatch<React.SetStateAction<GlobalTeam[]>>,
  globalTeamGroups: GlobalTeamGroup[],
  setGlobalTeamGroups: React.Dispatch<React.SetStateAction<GlobalTeamGroup[]>>,
  nodes: FlowNode[],
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
) {
  /**
   * Add a new global team to the pool.
   */
  const addGlobalTeam = useCallback(
    (label?: string, groupId?: string | null, databaseId?: number): GlobalTeam => {
      const id = databaseId ? `team-${databaseId}` : `team-${uuidv4()}`;
      const order = globalTeams.length;
      const color = TEAM_COLORS[order % TEAM_COLORS.length];

      const newTeam: GlobalTeam = {
        id,
        label: label ?? `Team ${order + 1}`,
        groupId: groupId ?? null,
        order,
        color,
      };

      setGlobalTeams((teams) => {
        // If team with this ID already exists, don't add it again
        if (teams.some(t => t.id === id)) return teams;
        return [...teams, newTeam];
      });
      return newTeam;
    },
    [globalTeams, setGlobalTeams]
  );

  /**
   * Replace a global team with a new one from the database, updating all game assignments.
   */
  const replaceGlobalTeam = useCallback(
    (oldTeamId: string, newTeamData: { id: number; text: string }) => {
      const newId = `team-${newTeamData.id}`;
      
      setGlobalTeams((teams) => teams.map((t) => {
        if (t.id === oldTeamId) {
          return {
            ...t,
            id: newId,
            label: newTeamData.text,
          };
        }
        return t;
      }));

      setNodes((nds) =>
        nds.map((n) => {
          if (!isGameNode(n)) return n;
          const data = n.data as GameNodeData;
          const updates: Partial<GameNodeData> = {};
          
          if (data.homeTeamId === oldTeamId) updates.homeTeamId = newId;
          if (data.awayTeamId === oldTeamId) updates.awayTeamId = newId;
          if (data.official === oldTeamId) updates.official = newId;
          
          if (Object.keys(updates).length === 0) return n;
          
          return {
            ...n,
            data: {
              ...data,
              ...updates,
            },
          };
        })
      );
    },
    [setGlobalTeams, setNodes]
  );

  /**
   * Update a global team's data.
   */
  const updateGlobalTeam = useCallback(
    (teamId: string, data: Partial<Omit<GlobalTeam, 'id'>>) => {
      setGlobalTeams((teams) => teams.map((t) => (t.id === teamId ? { ...t, ...data } : t)));
    },
    [setGlobalTeams]
  );

  /**
   * Delete a global team from the pool and unassign from games.
   */
  const deleteGlobalTeam = useCallback(
    (teamId: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (!isGameNode(n)) return n;
          const data = n.data as GameNodeData;
          return {
            ...n,
            data: {
              ...data,
              homeTeamId: data.homeTeamId === teamId ? null : data.homeTeamId,
              awayTeamId: data.awayTeamId === teamId ? null : data.awayTeamId,
            },
          };
        })
      );

      setGlobalTeams((teams) => teams.filter((t) => t.id !== teamId));
    },
    [setNodes, setGlobalTeams]
  );

  /**
   * Reorder a global team.
   */
  const reorderGlobalTeam = useCallback(
    (teamId: string, direction: 'up' | 'down') => {
      setGlobalTeams((teams) => {
        const sorted = [...teams].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex((t) => t.id === teamId);

        if (index === -1) return teams;

        if (direction === 'up' && index > 0) {
          [sorted[index], sorted[index - 1]] = [sorted[index - 1], sorted[index]];
        } else if (direction === 'down' && index < sorted.length - 1) {
          [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
        }

        return sorted.map((t, i) => ({ ...t, order: i }));
      });
    },
    [setGlobalTeams]
  );

  /**
   * Add a new global team group.
   */
  const addGlobalTeamGroup = useCallback(
    (name?: string): GlobalTeamGroup => {
      const id = `group-${uuidv4()}`;
      const order = globalTeamGroups.length;

      const newGroup: GlobalTeamGroup = {
        id,
        name: name ?? `Group ${order + 1}`,
        order,
      };

      setGlobalTeamGroups((groups) => [...groups, newGroup]);
      return newGroup;
    },
    [globalTeamGroups, setGlobalTeamGroups]
  );

  /**
   * Ensure the External Officials group exists.
   */
  const ensureOfficialsGroup = useCallback(
    (name: string): string => {
      const existing = globalTeamGroups.find(g => g.id === 'group-officials');
      if (existing) return existing.id;

      const newGroup: GlobalTeamGroup = {
        id: 'group-officials',
        name,
        order: -1, // Keep it at the top or handle via sorting
        color: '#6c757d'
      };

      setGlobalTeamGroups((groups) => [newGroup, ...groups]);
      return newGroup.id;
    },
    [globalTeamGroups, setGlobalTeamGroups]
  );

  /**
   * Update a global team group.
   */
  const updateGlobalTeamGroup = useCallback(
    (groupId: string, data: Partial<Omit<GlobalTeamGroup, 'id'>>) => {
      setGlobalTeamGroups((groups) => groups.map((g) => (g.id === groupId ? { ...g, ...data } : g)));
    },
    [setGlobalTeamGroups]
  );

  /**
   * Delete a global team group and its teams.
   */
  const deleteGlobalTeamGroup = useCallback(
    (groupId: string) => {
      const teamIdsToDelete = new Set(globalTeams.filter((t) => t.groupId === groupId).map((t) => t.id));

      setNodes((nds) =>
        nds.map((n) => {
          if (!isGameNode(n)) return n;
          const data = n.data as GameNodeData;
          return {
            ...n,
            data: {
              ...data,
              homeTeamId: data.homeTeamId && teamIdsToDelete.has(data.homeTeamId) ? null : data.homeTeamId,
              awayTeamId: data.awayTeamId && teamIdsToDelete.has(data.awayTeamId) ? null : data.awayTeamId,
            },
          };
        })
      );

      setGlobalTeams((teams) => teams.filter((t) => !teamIdsToDelete.has(t.id)));
      setGlobalTeamGroups((groups) => groups.filter((g) => g.id !== groupId));
    },
    [globalTeams, setNodes, setGlobalTeams, setGlobalTeamGroups]
  );

  /**
   * Reorder a global team group.
   */
  const reorderGlobalTeamGroup = useCallback(
    (groupId: string, direction: 'up' | 'down') => {
      setGlobalTeamGroups((groups) => {
        const sorted = [...groups].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex((g) => g.id === groupId);

        if (index === -1) return groups;

        if (direction === 'up' && index > 0) {
          [sorted[index], sorted[index - 1]] = [sorted[index - 1], sorted[index]];
        } else if (direction === 'down' && index < sorted.length - 1) {
          [sorted[index], sorted[index + 1]] = [sorted[index + 1], sorted[index]];
        }

        return sorted.map((g, i) => ({ ...g, order: i }));
      });
    },
    [setGlobalTeamGroups]
  );

  /**
   * Assign a global team to a game slot.
   */
  const assignTeamToGame = useCallback(
    (gameId: string, teamId: string, slot: 'home' | 'away') => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== gameId || !isGameNode(n)) return n;
          return {
            ...n,
            data: {
              ...n.data,
              [slot === 'home' ? 'homeTeamId' : 'awayTeamId']: teamId,
            },
          };
        })
      );
    },
    [setNodes]
  );

  /**
   * Unassign a team from a game slot.
   */
  const unassignTeamFromGame = useCallback(
    (gameId: string, slot: 'home' | 'away') => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== gameId || !isGameNode(n)) return n;
          return {
            ...n,
            data: {
              ...n.data,
              [slot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
            },
          };
        })
      );
    },
    [setNodes]
  );

  /**
   * Get all games that use a specific global team.
   */
  const getTeamUsage = useCallback(
    (teamId: string): { gameId: string; slot: 'home' | 'away' }[] => {
      const usages: { gameId: string; slot: 'home' | 'away' }[] = [];
      nodes.filter(isGameNode).forEach((game) => {
        const data = game.data as GameNodeData;
        if (data.homeTeamId === teamId) usages.push({ gameId: game.id, slot: 'home' });
        if (data.awayTeamId === teamId) usages.push({ gameId: game.id, slot: 'away' });
      });
      return usages;
    },
    [nodes]
  );

  return useMemo(() => ({
    addGlobalTeam,
    updateGlobalTeam,
    deleteGlobalTeam,
    reorderGlobalTeam,
    addGlobalTeamGroup,
    updateGlobalTeamGroup,
    deleteGlobalTeamGroup,
    reorderGlobalTeamGroup,
    assignTeamToGame,
    unassignTeamFromGame,
    replaceGlobalTeam,
    getTeamUsage,
    ensureOfficialsGroup,
  }), [
    addGlobalTeam, updateGlobalTeam, deleteGlobalTeam, reorderGlobalTeam,
    addGlobalTeamGroup, updateGlobalTeamGroup, deleteGlobalTeamGroup,
    reorderGlobalTeamGroup, assignTeamToGame, unassignTeamFromGame,
    replaceGlobalTeam, getTeamUsage, ensureOfficialsGroup
  ]);
}
