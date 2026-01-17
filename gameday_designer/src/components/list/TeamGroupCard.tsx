/**
 * TeamGroupCard Component
 *
 * Displays a single team group in a card format for grid layout.
 * Features:
 * - Collapsible card design
 * - Inline group name editing (double-click)
 * - Team list with inline editing
 * - Compact layout for grid display
 */

import React, { useState, useCallback } from 'react';
import { Card, Dropdown, DropdownButton } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import type { GlobalTeam, GlobalTeamGroup, HighlightedElement } from '../../types/flowchart';
import { ICONS } from '../../utils/iconConstants';

export interface TeamGroupCardProps {
  /** The group to display */
  group: GlobalTeamGroup;
  /** Teams in this group */
  teams: GlobalTeam[];
  /** All groups (for move dropdown) */
  allGroups: GlobalTeamGroup[];
  /** Currently highlighted element */
  highlightedElement?: HighlightedElement | null;
  /** Callback to update group data */
  onUpdateGroup: (groupId: string, data: Partial<Omit<GlobalTeamGroup, 'id'>>) => void;
  /** Callback to delete group */
  onDeleteGroup: (groupId: string) => void;
  /** Callback to reorder group */
  onReorderGroup: (groupId: string, direction: 'up' | 'down') => void;
  /** Callback to update team data */
  onUpdateTeam: (teamId: string, data: Partial<Omit<GlobalTeam, 'id'>>) => void;
  /** Callback to delete team */
  onDeleteTeam: (teamId: string) => void;
  /** Callback to reorder team */
  onReorderTeam: (teamId: string, direction: 'up' | 'down') => void;
  /** Callback to add a team to this group */
  onAddTeam: (groupId: string) => void;
  /** Function to get which games use a team */
  getTeamUsage: (teamId: string) => { gameId: string; slot: 'home' | 'away' }[];
  /** Index in sorted groups list (for reorder controls) */
  index: number;
  /** Total number of groups (for reorder controls) */
  totalGroups: number;
  /** Whether the designer is in read-only mode */
  readOnly?: boolean;
}

/**
 * TeamGroupCard component for grid display.
 */
const TeamGroupCard: React.FC<TeamGroupCardProps> = ({
  group,
  teams,
  allGroups,
  highlightedElement,
  onUpdateGroup,
  onDeleteGroup,
  onReorderGroup,
  onUpdateTeam,
  onDeleteTeam,
  onReorderTeam,
  onAddTeam,
  getTeamUsage,
  index,
  totalGroups,
  readOnly = false,
}) => {
  const { t } = useTypedTranslation(['ui']);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editedTeamLabel, setEditedTeamLabel] = useState('');

  /**
   * Toggle group expansion.
   */
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  /**
   * Start editing group name.
   */
  const handleStartEditGroupName = useCallback(() => {
    setEditingGroupName(true);
    setGroupName(group.name);
  }, [group.name]);

  /**
   * Save edited group name.
   */
  const handleSaveGroupName = useCallback(() => {
    setEditingGroupName(false);
    if (groupName.trim() !== '' && groupName !== group.name) {
      onUpdateGroup(group.id, { name: groupName.trim() });
    } else {
      setGroupName(group.name);
    }
  }, [groupName, group.id, group.name, onUpdateGroup]);

  /**
   * Handle key press in group name edit.
   */
  const handleGroupNameKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveGroupName();
      } else if (e.key === 'Escape') {
        setEditingGroupName(false);
        setGroupName(group.name);
      }
    },
    [handleSaveGroupName, group.name]
  );

  /**
   * Start editing team label.
   */
  const handleStartEditTeam = useCallback((team: GlobalTeam) => {
    setEditingTeamId(team.id);
    setEditedTeamLabel(team.label);
  }, []);

  /**
   * Save edited team label.
   */
  const handleSaveTeamLabel = useCallback(
    (teamId: string) => {
      if (editedTeamLabel.trim() !== '') {
        onUpdateTeam(teamId, { label: editedTeamLabel.trim() });
      }
      setEditingTeamId(null);
    },
    [editedTeamLabel, onUpdateTeam]
  );

  /**
   * Handle key press in team label edit.
   */
  const handleTeamKeyPress = useCallback(
    (e: React.KeyboardEvent, teamId: string) => {
      if (e.key === 'Enter') {
        handleSaveTeamLabel(teamId);
      } else if (e.key === 'Escape') {
        setEditingTeamId(null);
      }
    },
    [handleSaveTeamLabel]
  );

  /**
   * Move team to different group.
   */
  const handleMoveTeam = useCallback(
    (teamId: string, groupId: string | null) => {
      onUpdateTeam(teamId, { groupId });
    },
    [onUpdateTeam]
  );

  return (
    <Card className="team-group-card">
      <Card.Header
        className="d-flex align-items-center"
        style={{ cursor: 'pointer', backgroundColor: '#e9ecef' }}
        onClick={() => !editingGroupName && handleToggle()}
      >
        {/* Expand/collapse icon */}
        <i
          className={`bi ${isExpanded ? ICONS.EXPANDED : ICONS.COLLAPSED} me-2`}
          style={{ fontSize: '0.9rem' }}
        ></i>

        {/* Group name */}
        <div className="flex-grow-1" onClick={(e) => e.stopPropagation()}>
          {editingGroupName ? (
            <input
              type="text"
              className="form-control form-control-sm"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onBlur={handleSaveGroupName}
              onKeyDown={handleGroupNameKeyPress}
              autoFocus
            />
          ) : (
            <strong
              onDoubleClick={(e) => {
                if (readOnly) return;
                e.stopPropagation();
                handleStartEditGroupName();
              }}
              style={{ cursor: readOnly ? 'default' : 'text' }}
              title={readOnly ? undefined : t('ui:message.doubleClickToEdit')}
            >
              {group.name}
            </strong>
          )}
        </div>

        {/* Group actions */}
        <div className="d-flex gap-1 ms-auto" onClick={(e) => e.stopPropagation()}>
          {!readOnly && (
            <>
              <button
                className="btn btn-sm btn-outline-primary btn-adaptive"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTeam(group.id);
                }}
                title={t('ui:tooltip.addTeamToGroup')}
              >
                <i className={`bi ${ICONS.ADD} me-2`}></i>
                <span className="btn-label-adaptive">{t('ui:button.addTeam')}</span>
              </button>
              <button
                className="btn btn-sm btn-outline-secondary btn-adaptive"
                onClick={(e) => {
                  e.stopPropagation();
                  onReorderGroup(group.id, 'up');
                }}
                disabled={index === 0}
                title={t('ui:tooltip.moveGroupUp')}
              >
                <i className={`bi ${ICONS.REORDER_UP} me-2`}></i>
                <span className="btn-label-adaptive">{t('ui:button.up')}</span>
              </button>
              <button
                className="btn btn-sm btn-outline-secondary btn-adaptive"
                onClick={(e) => {
                  e.stopPropagation();
                  onReorderGroup(group.id, 'down');
                }}
                disabled={index === totalGroups - 1}
                title={t('ui:tooltip.moveGroupDown')}
              >
                <i className={`bi ${ICONS.REORDER_DOWN} me-2`}></i>
                <span className="btn-label-adaptive">{t('ui:button.down')}</span>
              </button>
              <button
                className="btn btn-sm btn-outline-danger btn-adaptive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(group.id);
                }}
                title={t('ui:tooltip.deleteGroup')}
              >
                <i className={`bi ${ICONS.DELETE}`}></i>
              </button>
            </>
          )}
        </div>
      </Card.Header>

      {/* Group body (teams) */}
      {isExpanded && (
        <Card.Body className="p-2">
          {teams.length === 0 ? (
            <div className="text-center py-3">
              <i className={`bi ${ICONS.TEAM} me-2`} style={{ fontSize: '2rem', opacity: 0.3 }}></i>
              <p className="text-muted mb-3">{t('ui:message.noTeamsInGroup')}</p>
              {!readOnly && (
                <button
                  className="btn btn-outline-primary btn-adaptive"
                  onClick={() => onAddTeam(group.id)}
                  title="Add your first team to this group"
                >
                  <i className={`bi ${ICONS.ADD}`}></i>
                  <span className="btn-label-adaptive">{t('ui:button.addTeam')}</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {teams.map((team, idx) => {
              const isEditing = editingTeamId === team.id;
              const usages = getTeamUsage(team.id);
              const isHighlighted = highlightedElement?.id === team.id && highlightedElement?.type === 'team';

              return (
                <div
                  key={team.id}
                  id={`team-${team.id}`}
                  className={`d-flex align-items-center justify-content-between py-2 px-2 border-bottom ${isHighlighted ? 'element-highlighted' : ''}`}
                  style={{ backgroundColor: '#fff', fontSize: '0.875rem' }}
                >
                  {/* Team color */}
                  <div className="me-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="color"
                      value={team.color || '#6c757d'}
                      onChange={(e) => !readOnly && onUpdateTeam(team.id, { color: e.target.value })}
                      title={readOnly ? undefined : "Change the color badge for this team"}
                      style={{
                        width: '24px',
                        height: '24px',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: readOnly ? 'default' : 'pointer'
                      }}
                      disabled={readOnly}
                    />
                  </div>

                  {/* Team label */}
                  <div className="flex-grow-1 me-2" style={{ minWidth: 0 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editedTeamLabel}
                        onChange={(e) => setEditedTeamLabel(e.target.value)}
                        onBlur={() => handleSaveTeamLabel(team.id)}
                        onKeyDown={(e) => handleTeamKeyPress(e, team.id)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => !readOnly && handleStartEditTeam(team)}
                        style={{ cursor: readOnly ? 'default' : 'text' }}
                        title={readOnly ? undefined : "Double-click to edit team label"}
                        className="text-truncate d-block"
                      >
                        {team.label}
                      </span>
                    )}
                  </div>

                  {/* Usage count */}
                  <div className="me-2 flex-shrink-0">
                    <small className="text-muted" title="Number of games this team is assigned to">
                      <strong>{usages.length}</strong>
                    </small>
                  </div>

                  {/* Actions */}
                  {!readOnly && (
                    <div className="d-flex gap-1 flex-shrink-0">
                      {/* Reorder up */}
                      <button
                        className="btn btn-sm btn-outline-secondary p-1 btn-adaptive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderTeam(team.id, 'up');
                        }}
                        disabled={idx === 0}
                        title={t('ui:tooltip.moveTeamUp')}
                        style={{ fontSize: '0.75rem', lineHeight: 1 }}
                      >
                        <i className={`bi ${ICONS.REORDER_UP} me-2`}></i>
                        <span className="btn-label-adaptive">{t('ui:button.up')}</span>
                      </button>

                      {/* Reorder down */}
                      <button
                        className="btn btn-sm btn-outline-secondary p-1 btn-adaptive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderTeam(team.id, 'down');
                        }}
                        disabled={idx === teams.length - 1}
                        title={t('ui:tooltip.moveTeamDown')}
                        style={{ fontSize: '0.75rem', lineHeight: 1 }}
                      >
                        <i className={`bi ${ICONS.REORDER_DOWN} me-2`}></i>
                        <span className="btn-label-adaptive">{t('ui:button.down')}</span>
                      </button>

                      {/* Move to group dropdown */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownButton
                          id={`move-team-${team.id}`}
                          title={<i className={`bi ${ICONS.FOLDER}`} title={t('ui:tooltip.moveTeamToGroup')}></i>}
                          size="sm"
                          variant="outline-primary"
                          className="p-0 btn-adaptive"
                          popperConfig={{ strategy: 'fixed' }}
                        >
                          {allGroups.map((g) => (
                            <Dropdown.Item
                              key={g.id}
                              onClick={() => handleMoveTeam(team.id, g.id)}
                              active={team.groupId === g.id}
                            >
                              {g.name}
                            </Dropdown.Item>
                          ))}
                        </DropdownButton>
                      </div>

                      {/* Delete */}
                      <button
                        className="btn btn-sm btn-outline-danger p-1 btn-adaptive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTeam(team.id);
                        }}
                        title={t('ui:tooltip.deleteTeam')}
                        style={{ fontSize: '0.75rem', lineHeight: 1 }}
                      >
                        <i className={`bi ${ICONS.DELETE}`}></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            </>
          )}
        </Card.Body>
      )}
    </Card>
  );
};

export default TeamGroupCard;
