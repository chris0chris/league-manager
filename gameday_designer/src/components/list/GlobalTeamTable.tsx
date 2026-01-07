/**
 * GlobalTeamTable Component
 *
 * Displays and manages the global team pool organized into collapsible groups.
 * Features:
 * - CSS Grid layout for responsive display (max 4 columns)
 * - Collapsible group cards
 * - Inline group name editing (double-click)
 * - Team reordering within groups
 * - Move teams between groups via dropdown
 * - "Ungrouped Teams" section for teams without a group
 * - Shows team usage count across games
 */

import React from 'react';
import { Button } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import type { GlobalTeam, GlobalTeamGroup, FlowNode } from '../../types/flowchart';
import TeamGroupCard from './TeamGroupCard';
import { ICONS } from '../../utils/iconConstants';
import './GlobalTeamTable.css';

export interface GlobalTeamTableProps {
  /** All global teams */
  teams: GlobalTeam[];
  /** All global team groups */
  groups: GlobalTeamGroup[];
  /** Callback to add a new group */
  onAddGroup: () => void;
  /** Callback to update group data */
  onUpdateGroup: (groupId: string, data: Partial<Omit<GlobalTeamGroup, 'id'>>) => void;
  /** Callback to delete a group */
  onDeleteGroup: (groupId: string) => void;
  /** Callback to reorder a group */
  onReorderGroup: (groupId: string, direction: 'up' | 'down') => void;
  /** Callback to add a team to a specific group */
  onAddTeam: (groupId: string) => void;
  /** Callback to update team data */
  onUpdate: (teamId: string, data: Partial<Omit<GlobalTeam, 'id'>>) => void;
  /** Callback to delete a team */
  onDelete: (teamId: string) => void;
  /** Callback to reorder a team */
  onReorder: (teamId: string, direction: 'up' | 'down') => void;
  /** Function to get which games use a team */
  getTeamUsage: (teamId: string) => { gameId: string; slot: 'home' | 'away' }[];
  /** All nodes (for resolving game names) */
  allNodes: FlowNode[];
}

/**
 * GlobalTeamTable component with group-based organization.
 */
const GlobalTeamTable: React.FC<GlobalTeamTableProps> = ({
  teams,
  groups,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onReorderGroup,
  onAddTeam,
  onUpdate,
  onDelete,
  onReorder,
  getTeamUsage,
  // allNodes - unused for now but kept in props for future use
}) => {
  const { t } = useTypedTranslation(['ui']);
  // const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  // const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  // const [editedGroupName, setEditedGroupName] = useState('');
  // const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  // const [editedTeamLabel, setEditedTeamLabel] = useState('');

  /**
   * Toggle group expansion.
   * TODO: Re-enable when group expansion feature is implemented
   */
  // const handleToggleGroup = useCallback((groupId: string) => {
  //   setExpandedGroupIds((prev) => {
  //     const next = new Set(prev);
  //     if (next.has(groupId)) {
  //       next.delete(groupId);
  //     } else {
  //       next.add(groupId);
  //     }
  //     return next;
  //   });
  // }, []);

  /**
   * Start editing a group name.
   * TODO: Re-enable when group inline editing feature is implemented
   */
  // const handleStartEditGroup = useCallback((group: GlobalTeamGroup) => {
  //   setEditingGroupId(group.id);
  //   setEditedGroupName(group.name);
  // }, []);

  /**
   * Save edited group name.
   * TODO: Re-enable when group inline editing feature is implemented
   */
  // const handleSaveGroupName = useCallback(
  //   (groupId: string) => {
  //     if (editedGroupName.trim() !== '') {
  //       onUpdateGroup(groupId, { name: editedGroupName.trim() });
  //     }
  //     setEditingGroupId(null);
  //   },
  //   [editedGroupName, onUpdateGroup]
  // );

  /**
   * Cancel group name editing.
   * TODO: Re-enable when group inline editing feature is implemented
   */
  // const handleCancelEditGroup = useCallback(() => {
  //   setEditingGroupId(null);
  // }, []);

  /**
   * Handle key press in group name edit input.
   * TODO: Re-enable when group inline editing feature is implemented
   */
  // const handleGroupKeyPress = useCallback(
  //   (e: React.KeyboardEvent, groupId: string) => {
  //     if (e.key === 'Enter') {
  //       handleSaveGroupName(groupId);
  //     } else if (e.key === 'Escape') {
  //       handleCancelEditGroup();
  //     }
  //   },
  //   [handleSaveGroupName, handleCancelEditGroup]
  // );

  /**
   * Start editing a team label.
   * TODO: Re-enable when team inline editing feature is implemented
   */
  // const handleStartEditTeam = useCallback((team: GlobalTeam) => {
  //   setEditingTeamId(team.id);
  //   setEditedTeamLabel(team.label);
  // }, []);

  /**
   * Save edited team label.
   * TODO: Re-enable when team inline editing feature is implemented
   */
  // const handleSaveTeamLabel = useCallback(
  //   (teamId: string) => {
  //     if (editedTeamLabel.trim() !== '') {
  //       onUpdate(teamId, { label: editedTeamLabel.trim() });
  //     }
  //     setEditingTeamId(null);
  //   },
  //   [editedTeamLabel, onUpdate]
  // );

  /**
   * Cancel team label editing.
   * TODO: Re-enable when team inline editing feature is implemented
   */
  // const handleCancelEditTeam = useCallback(() => {
  //   setEditingTeamId(null);
  // }, []);

  /**
   * Handle key press in team label edit input.
   * TODO: Re-enable when team inline editing feature is implemented
   */
  // const handleTeamKeyPress = useCallback(
  //   (e: React.KeyboardEvent, teamId: string) => {
  //     if (e.key === 'Enter') {
  //       handleSaveTeamLabel(teamId);
  //     } else if (e.key === 'Escape') {
  //       handleCancelEditTeam();
  //     }
  //   },
  //   [handleSaveTeamLabel, handleCancelEditTeam]
  // );

  /**
   * Move a team to a different group.
   * TODO: Re-enable when team move feature is implemented
   */
  // const handleMoveToGroup = useCallback(
  //   (teamId: string, groupId: string | null) => {
  //     onUpdate(teamId, { groupId });
  //   },
  //   [onUpdate]
  // );

  // Sort groups by order
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  // Sort teams by order
  const sortedTeams = [...teams].sort((a, b) => a.order - b.order);

  // Group teams by groupId
  const teamsByGroup = new Map<string | null, GlobalTeam[]>();
  teamsByGroup.set(null, []); // Ungrouped teams
  for (const group of sortedGroups) {
    teamsByGroup.set(group.id, []);
  }
  for (const team of sortedTeams) {
    const list = teamsByGroup.get(team.groupId) || [];
    list.push(team);
    teamsByGroup.set(team.groupId, list);
  }



  return (
    <div>
      {sortedGroups.length === 0 ? (
        /* Empty state - icon, message, and button */
        <div className="text-center py-5">
          <i className={`bi ${ICONS.TEAM}`} style={{ fontSize: '4rem', opacity: 0.3 }}></i>
          <h3 className="mt-3">{t('ui:message.noGroupsYet')}</h3>
          <p className="text-muted mb-3">{t('ui:message.createFirstGroup')}</p>
          <Button
            variant="outline-primary"
            onClick={onAddGroup}
          >
            <i className={`bi ${ICONS.ADD} me-1`}></i>
            {t('ui:button.addGroup')}
          </Button>
        </div>
      ) : (
        /* CSS Grid layout for groups */
        <div className="team-groups-grid compact-actions">
          {/* Render group cards */}
          {sortedGroups.map((group, index) => {
            const teamsInGroup = teamsByGroup.get(group.id) || [];
            return (
              <TeamGroupCard
                key={group.id}
                group={group}
                teams={teamsInGroup}
                allGroups={sortedGroups}
                onUpdateGroup={onUpdateGroup}
                onDeleteGroup={onDeleteGroup}
                onReorderGroup={onReorderGroup}
                onUpdateTeam={onUpdate}
                onDeleteTeam={onDelete}
                onReorderTeam={onReorder}
                onAddTeam={onAddTeam}
                getTeamUsage={getTeamUsage}
                index={index}
                totalGroups={sortedGroups.length}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GlobalTeamTable;
