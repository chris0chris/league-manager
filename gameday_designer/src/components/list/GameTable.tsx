/**
 * GameTable Component
 *
 * Displays games in a stage as a table.
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import { Table, Form } from 'react-bootstrap';
import Select, { components, StylesConfig, GroupBase } from 'react-select';
import type { 
  GameNode, 
  FlowEdge, 
  FlowNode, 
  GlobalTeam, 
  GlobalTeamGroup, 
  GameNodeData,
  HighlightedElement
} from '../../types/flowchart';
import { isGameNode, isStageNode } from '../../types/flowchart';
import { isRankReference } from '../../types/designer';
import { findSourceGameForReference, findSourceStageForReference, getGamePath } from '../../utils/edgeAnalysis';
import { getStageParticipants } from '../../utils/rankingEngine';
import { isValidTimeFormat } from '../../utils/timeCalculation';
import { ICONS } from '../../utils/iconConstants';
import './GameTable.css';

// Type for select options
interface TeamOption {
  value: string;
  label: string;
  color?: string;
  isTeam?: boolean;
  isStageHeader?: boolean;
  isDisabled?: boolean;
}

// Custom Option component with colored dot for teams and stage headers
const CustomOption = memo((props: { data: TeamOption; isDisabled?: boolean; children?: React.ReactNode; innerProps?: Record<string, unknown> }) => {
  const { data } = props;

  if (data.isStageHeader) {
    return (
      <components.Option {...props} isDisabled={true}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            color: '#6c757d',
            borderLeft: `3px solid ${data.color || '#dee2e6'}`,
            paddingLeft: '8px',
            marginLeft: '-12px',
            paddingTop: '4px',
            paddingBottom: '4px',
            backgroundColor: '#f8f9fa'
          }}
        >
          <span>{data.label}</span>
        </div>
      </components.Option>
    );
  }

  return (
    <components.Option {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {data.color && (
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: data.color,
              flexShrink: 0
            }}
          />
        )}
        <span>{data.label}</span>
      </div>
    </components.Option>
  );
});

// Custom SingleValue component with colored dot for selected value
const CustomSingleValue = memo((props: { data: TeamOption; children?: React.ReactNode }) => {
  const { data } = props;
  return (
    <components.SingleValue {...props}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {data.color && (
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: data.color,
              flexShrink: 0
            }}
          />
        )}
        <span>{data.label}</span>
      </div>
    </components.SingleValue>
  );
});

/**
 * Helper function to build team options grouped by team groups.
 */
function buildGroupedTeamOptions(
  teams: GlobalTeam[],
  groups: GlobalTeamGroup[]
): TeamOption[] {
  const options: TeamOption[] = [];
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  sortedGroups.forEach(group => {
    const groupTeams = teams
      .filter(team => team.groupId === group.id)
      .sort((a, b) => a.order - b.order);

    if (groupTeams.length > 0) {
      options.push({
        value: `group-header-${group.id}`,
        label: group.name,
        color: group.color || '#6c757d',
        isStageHeader: true,
        isDisabled: true
      });

      groupTeams.forEach(team => {
        options.push({
          value: team.id,
          label: team.label,
          color: team.color || '#6c757d',
          isTeam: true
        });
      });
    }
  });

  const ungroupedTeams = teams
    .filter(team => team.groupId === null)
    .sort((a, b) => a.order - b.order);

  if (ungroupedTeams.length > 0) {
    options.push({
      value: 'group-header-ungrouped',
      label: 'Ungrouped',
      color: '#adb5bd',
      isStageHeader: true,
      isDisabled: true
    });

    ungroupedTeams.forEach(team => {
      options.push({
        value: team.id,
        label: team.label,
        color: team.color || '#6c757d',
        isTeam: true
      });
    });
  }

  return options;
}

const customSelectStyles: StylesConfig<TeamOption, false, GroupBase<TeamOption>> = {
  control: (provided) => ({ ...provided, minHeight: '31px', fontSize: '0.875rem', borderColor: '#dee2e6' }),
  option: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '6px 12px' }),
  singleValue: (provided) => ({ ...provided, fontSize: '0.875rem' }),
  menu: (provided) => ({ ...provided, zIndex: 9999 }),
  menuPortal: (provided) => ({ ...provided, zIndex: 9999 })
};

export interface GameTableProps {
  games: GameNode[];
  edges: FlowEdge[];
  allNodes: FlowNode[];
  globalTeams: GlobalTeam[];
  globalTeamGroups: GlobalTeamGroup[];
  highlightedElement?: HighlightedElement | null;
  onUpdate: (nodeId: string, data: Partial<GameNode['data']>) => void;
  onDelete: (nodeId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  onAssignTeam: (gameId: string, teamId: string, slot: 'home' | 'away') => void;
  onAddGameToGameEdge: (sourceGameId: string, outputType: 'winner' | 'loser', targetGameId: string, targetSlot: 'home' | 'away') => void;
  onAddStageToGameEdge: (sourceStageId: string, sourceRank: number, targetGameId: string, targetSlot: 'home' | 'away') => void;
  onRemoveEdgeFromSlot: (targetGameId: string, targetSlot: 'home' | 'away') => void;
  highlightedSourceGameId?: string | null;
  onDynamicReferenceClick: (sourceGameId: string) => void;
  readOnly?: boolean;
}

const GameTable: React.FC<GameTableProps> = memo(({
  games,
  edges,
  allNodes,
  globalTeams,
  globalTeamGroups,
  highlightedElement,
  onDelete,
  onSelectNode,
  selectedNodeId,
  onAssignTeam,
  onUpdate,
  onAddGameToGameEdge,
  onAddStageToGameEdge,
  onRemoveEdgeFromSlot,
  highlightedSourceGameId,
  onDynamicReferenceClick,
  readOnly = false,
}) => {
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'standing' | 'breakAfter' | 'time' | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');

  const handleRowClick = useCallback((gameId: string) => {
    onSelectNode(gameId);
  }, [onSelectNode]);

  const handleDelete = useCallback((e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    onDelete(gameId);
  }, [onDelete]);

  const handleStartEdit = useCallback(
    (e: React.MouseEvent, game: GameNode, field: 'standing' | 'breakAfter' | 'time') => {
      e.stopPropagation();
      setEditingGameId(game.id);
      setEditingField(field);
      if (field === 'standing') {
        setEditedValue(game.data.standing);
      } else if (field === 'breakAfter') {
        setEditedValue(String(game.data.breakAfter || 0));
      } else if (field === 'time') {
        setEditedValue(game.data.startTime || '');
      }
    },
    []
  );

  const handleSaveEdit = useCallback(
    (gameId: string, field: 'standing' | 'breakAfter' | 'time') => {
      if (field === 'standing') {
        if (editedValue.trim() !== '') {
          onUpdate(gameId, { standing: editedValue.trim() });
        }
      } else if (field === 'breakAfter') {
        if (editedValue.trim() !== '') {
          const numValue = parseInt(editedValue, 10);
          if (!isNaN(numValue) && numValue >= 0) {
            onUpdate(gameId, { breakAfter: numValue });
          }
        }
      } else if (field === 'time') {
        if (editedValue.trim() !== '') {
          if (isValidTimeFormat(editedValue.trim())) {
            onUpdate(gameId, { startTime: editedValue.trim(), manualTime: true });
          } else {
            alert('Invalid time format. Use HH:MM (24-hour)');
            return;
          }
        } else {
          onUpdate(gameId, { startTime: undefined, manualTime: false });
        }
      }
      setEditingGameId(null);
      setEditingField(null);
    },
    [editedValue, onUpdate]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingGameId(null);
    setEditingField(null);
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent, gameId: string, field: 'standing' | 'breakAfter' | 'time') => {
      if (e.key === 'Enter') {
        handleSaveEdit(gameId, field);
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  const getEligibleSourceGames = useCallback((targetGame: GameNode): GameNode[] => {
    const targetPath = getGamePath(targetGame.id, allNodes);
    if (!targetPath) return [];

    const targetStageOrder = targetPath.stage.data.order;
    const targetStageId = targetPath.stage.id;
    const targetNodeIndex = allNodes.findIndex(n => n.id === targetGame.id);

    return allNodes
      .filter((node): node is GameNode => {
        if (!isGameNode(node) || node.id === targetGame.id) return false;
        const path = getGamePath(node.id, allNodes);
        if (!path) return false;
        if (path.stage.data.order < targetStageOrder) return true;
        if (path.stage.id === targetStageId) {
          const sourceNodeIndex = allNodes.findIndex(n => n.id === node.id);
          return sourceNodeIndex >= 0 && sourceNodeIndex < targetNodeIndex;
        }
        return false;
      })
      .sort((a, b) => {
        const pathA = getGamePath(a.id, allNodes)!;
        const pathB = getGamePath(b.id, allNodes)!;
        return pathA.stage.data.order - pathB.stage.data.order;
      });
  }, [allNodes]);

  const handleTeamChange = useCallback((gameId: string, slot: 'home' | 'away', value: string) => {
    onRemoveEdgeFromSlot(gameId, slot);
    if (!value) return;
    if (value.startsWith('winner:') || value.startsWith('loser:')) {
      const [outputType, sourceGameId] = value.split(':');
      onAddGameToGameEdge(sourceGameId, outputType as 'winner' | 'loser', gameId, slot);
    } else if (value.startsWith('rank:')) {
      const [, sourceStageId, place] = value.split(':');
      onAddStageToGameEdge(sourceStageId, parseInt(place, 10), gameId, slot);
    } else {
      onAssignTeam(gameId, value, slot);
    }
  }, [onRemoveEdgeFromSlot, onAddGameToGameEdge, onAddStageToGameEdge, onAssignTeam]);

  const handleOfficialChange = useCallback(
    (gameId: string, value: string) => {
      onUpdate(gameId, { official: value || undefined });
    },
    [onUpdate]
  );

  const teamOptions = useMemo(() => buildGroupedTeamOptions(globalTeams, globalTeamGroups), [globalTeams, globalTeamGroups]);

  const rankingStageOptions = useMemo(() => {
    // Determine the current stage ID (assume all games in table belong to same stage)
    const currentStageId = games[0]?.parentId;
    
    const rankingStages = allNodes.filter(n => 
      isStageNode(n) && 
      n.data.stageType === 'RANKING' &&
      n.id !== currentStageId // Prevent self-reference
    ) as StageNode[];
    const options: TeamOption[] = [];

    rankingStages.forEach(stage => {
      options.push({ 
        value: `stage-header-${stage.id}`, 
        label: `${stage.data.name} (Ranking)`, 
        color: stage.data.color || '#0d6efd', 
        isStageHeader: true, 
        isDisabled: true 
      });

      // Find all games in this stage
      const stageGames = allNodes.filter(n => isGameNode(n) && n.parentId === stage.id) as GameNode[];
      const participants = getStageParticipants(stageGames);
      
      // For each participant, add a rank option
      participants.forEach((_, index) => {
        const place = index + 1;
        options.push({
          value: `rank:${stage.id}:${place}`,
          label: `🏆 ${place}. Place from ${stage.data.name}`,
          isTeam: false
        });
      });
    });

    return options;
  }, [allNodes, games]);

  const renderTimeCell = (game: GameNode) => {
    const isEditingTime = editingGameId === game.id && editingField === 'time';
    const timeValue = game.data.startTime || '';
    const isManual = game.data.manualTime;

    return (
      <td style={{ backgroundColor: isManual ? '#fff3cd' : undefined }} onClick={(e) => e.stopPropagation()}>
        {isEditingTime ? (
          <Form.Control
            type="time"
            size="sm"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            onBlur={() => handleSaveEdit(game.id, 'time')}
            onKeyDown={(e) => handleKeyPress(e, game.id, 'time')}
            autoFocus
            style={{ fontSize: '0.875rem', width: '110px' }}
          />
        ) : (
          <div className="d-flex align-items-center gap-1">
            <span 
              onClick={(e) => !readOnly && handleStartEdit(e, game, 'time')} 
              style={{ cursor: readOnly ? 'default' : 'text' }}
              title={readOnly ? undefined : (isManual ? 'Manually set - click to edit' : 'Auto-calculated - click to override')}
            >
              {timeValue || '--:--'}
            </span>
            {isManual && <i className="bi bi-pencil-fill text-warning" style={{ fontSize: '0.7rem' }} />}
          </div>
        )}
      </td>
    );
  };

  const renderOfficialCell = (game: GameNode) => {
    const official = game.data.official;
    const hasOfficial = !!official;
    const eligibleGames = getEligibleSourceGames(game);
    
    const options = [
      ...teamOptions,
      ...rankingStageOptions
    ];
    const gamesByStage = new Map<string, { name: string; games: GameNode[] }>();
    eligibleGames.forEach((sourceGame) => {
      const sourcePath = getGamePath(sourceGame.id, allNodes);
      const stageId = sourcePath?.stage.id || '';
      if (!gamesByStage.has(stageId)) {
        gamesByStage.set(stageId, { name: sourcePath?.stage.data.name || '', games: [] });
      }
      gamesByStage.get(stageId)!.games.push(sourceGame);
    });

    Array.from(gamesByStage.entries()).forEach(([stageId, stageData]) => {
      const stageNode = allNodes.find(n => n.id === stageId);
      options.push({ value: `stage-header-${stageId}`, label: stageData.name, color: (stageNode?.data as import('../../types/flowchart').StageNodeData)?.color || '#0d6efd', isStageHeader: true, isDisabled: true });
      stageData.games.forEach((sourceGame) => {
        options.push({ value: `winner:${sourceGame.id}`, label: `⚡ Winner of ${sourceGame.data.standing} (${stageData.name})`, isTeam: false });
        options.push({ value: `loser:${sourceGame.id}`, label: `💔 Loser of ${sourceGame.data.standing} (${stageData.name})`, isTeam: false });
      });
    });

    return (
      <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Form.Check
          type="checkbox"
          checked={hasOfficial}
          disabled={readOnly}
          onChange={(e) => {
            if (!e.target.checked) handleOfficialChange(game.id, '');
            else if (globalTeams.length > 0) handleOfficialChange(game.id, globalTeams[0].id);
          }}
        />
        {hasOfficial && (
          <Select<TeamOption>
            value={options.find(opt => opt.value === official) || null}
            options={options}
            onChange={(newValue) => newValue && handleOfficialChange(game.id, newValue.value)}
            components={{ Option: CustomOption, SingleValue: CustomSingleValue }}
            isOptionDisabled={(option) => option.isDisabled || false}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{ ...customSelectStyles, control: (provided) => ({ ...provided, minHeight: '31px', fontSize: '0.875rem', borderColor: '#dee2e6', minWidth: '150px' }) }}
            isClearable={false}
            isSearchable={false}
            isDisabled={readOnly}
          />
        )}
      </div>
    );
  };

  const renderTeamCell = (game: GameNode, slot: 'home' | 'away') => {
    const data = game.data as GameNodeData;
    const dynamicRef = slot === 'home' ? data.homeTeamDynamic : data.awayTeamDynamic;
    const teamId = slot === 'home' ? data.homeTeamId : data.awayTeamId;
    const resolvedName = slot === 'home' ? (data as any).resolvedHomeTeam : (data as any).resolvedAwayTeam;
    
    let currentValue = '';
    if (dynamicRef) {
      if (isRankReference(dynamicRef)) {
        const source = findSourceStageForReference(game.id, slot, edges, allNodes);
        if (source) currentValue = `rank:${source.stage.id}:${source.rank}`;
      } else {
        const sourceGame = findSourceGameForReference(game.id, slot, edges, allNodes);
        if (sourceGame) currentValue = `${dynamicRef.type === 'loser' ? 'loser' : 'winner'}:${sourceGame.id}`;
      }
    } else if (teamId) currentValue = teamId;

    const options = [
      { value: '', label: '-- Select Team --' }, 
      ...teamOptions,
      ...rankingStageOptions
    ];
    const eligibleGames = getEligibleSourceGames(game);
    const gamesByStage = new Map<string, { name: string; games: GameNode[] }>();
    eligibleGames.forEach((sourceGame) => {
      const sourcePath = getGamePath(sourceGame.id, allNodes);
      const stageId = sourcePath?.stage.id || '';
      if (!gamesByStage.has(stageId)) {
        gamesByStage.set(stageId, { name: sourcePath?.stage.data.name || '', games: [] });
      }
      gamesByStage.get(stageId)!.games.push(sourceGame);
    });

    Array.from(gamesByStage.entries()).forEach(([stageId, stageData]) => {
      const stageNode = allNodes.find(n => n.id === stageId);
      options.push({ value: `stage-header-${stageId}`, label: stageData.name, color: (stageNode?.data as import('../../types/flowchart').StageNodeData)?.color || '#0d6efd', isStageHeader: true, isDisabled: true });
      stageData.games.forEach((sourceGame) => {
        options.push({ value: `winner:${sourceGame.id}`, label: `⚡ Winner of ${sourceGame.data.standing} (${stageData.name})`, isTeam: false });
        options.push({ value: `loser:${sourceGame.id}`, label: `💔 Loser of ${sourceGame.data.standing} (${stageData.name})`, isTeam: false });
      });
    });

    if (readOnly && dynamicRef) {
      return (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (onDynamicReferenceClick) {
              if (isRankReference(dynamicRef)) {
                const source = findSourceStageForReference(game.id, slot, edges, allNodes);
                if (source) onDynamicReferenceClick(source.stage.id);
              } else {
                const sourceGame = findSourceGameForReference(game.id, slot, edges, allNodes);
                if (sourceGame) onDynamicReferenceClick(sourceGame.id);
              }
            }
          }}
          style={{ cursor: 'pointer' }}
          className="d-flex flex-column"
        >
          <span className="small text-muted mb-1">
            {dynamicRef.type === 'winner' ? 'Winner' : 'Loser'} {dynamicRef.matchName}
          </span>
          {resolvedName ? (
            <strong className="text-primary">{resolvedName}</strong>
          ) : (
            <span className="text-muted italic">TBD</span>
          )}
        </div>
      );
    }

    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (dynamicRef && onDynamicReferenceClick) {
            if (isRankReference(dynamicRef)) {
              const source = findSourceStageForReference(game.id, slot, edges, allNodes);
              if (source) onDynamicReferenceClick(source.stage.id);
            } else {
              const sourceGame = findSourceGameForReference(game.id, slot, edges, allNodes);
              if (sourceGame) onDynamicReferenceClick(sourceGame.id);
            }
          }
        }}
        style={{ cursor: dynamicRef ? 'pointer' : 'default' }}
      >
        <Select<TeamOption>
          value={options.find(opt => opt.value === currentValue) || options[0]}
          options={options}
          onChange={(newValue) => newValue && handleTeamChange(game.id, slot, newValue.value)}
          components={{ Option: CustomOption, SingleValue: CustomSingleValue }}
          isOptionDisabled={(option) => option.isDisabled || false}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          styles={customSelectStyles}
          isClearable={false}
          isSearchable={false}
          isDisabled={readOnly}
        />
      </div>
    );
  };

  if (games.length === 0) {
    return <div className="text-muted text-center py-2"><i className={`bi ${ICONS.TOURNAMENT} me-2`} />No games in this stage.</div>;
  }

  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          <th>Standing</th>
          <th>Time</th>
          <th>Home</th>
          <th>Away</th>
          {readOnly && <th>Score</th>}
          <th>Official</th>
          <th>Break After</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {games.map((game) => {
          const isHighlighted = highlightedElement?.id === game.id && highlightedElement?.type === 'game';
          const isSourceHighlighted = highlightedSourceGameId === game.id;
          const score = game.data.final_score ? `${game.data.final_score.home}:${game.data.final_score.away}` : (game.data.halftime_score ? `(${game.data.halftime_score.home}:${game.data.halftime_score.away})` : '--:--');

          return (
            <tr 
              key={game.id} 
              id={`game-${game.id}`} 
              onClick={() => handleRowClick(game.id)} 
              className={`${isHighlighted ? 'element-highlighted' : ''} ${isSourceHighlighted ? 'source-highlighted' : ''}`}
              style={{ 
                cursor: 'pointer', 
                backgroundColor: selectedNodeId === game.id ? '#fff3cd' : undefined 
              }}
            >
              <td onClick={(e) => e.stopPropagation()}>
                {editingGameId === game.id && editingField === 'standing' ? (
                  <Form.Control type="text" size="sm" value={editedValue} onChange={(e) => setEditedValue(e.target.value)} onBlur={() => handleSaveEdit(game.id, 'standing')} onKeyDown={(e) => handleKeyPress(e, game.id, 'standing')} autoFocus style={{ fontSize: '0.875rem' }} />
                ) : (
                  <span 
                    onClick={(e) => !readOnly && handleStartEdit(e, game, 'standing')} 
                    style={{ cursor: readOnly ? 'default' : 'text' }}
                    title={readOnly ? undefined : "Click to edit"}
                  >
                    {game.data.standing}
                  </span>
                )}
              </td>
              {renderTimeCell(game)}
              <td>{renderTeamCell(game, 'home')}</td>
              <td>{renderTeamCell(game, 'away')}</td>
              {readOnly && (
                <td className="text-center fw-bold">
                  <span className={game.data.final_score ? 'text-dark' : 'text-muted italic small'}>
                    {score}
                  </span>
                </td>
              )}
              <td>{renderOfficialCell(game)}</td>
              <td onClick={(e) => e.stopPropagation()}>
                {editingGameId === game.id && editingField === 'breakAfter' ? (
                  <Form.Control type="number" size="sm" value={editedValue} onChange={(e) => setEditedValue(e.target.value)} onBlur={() => handleSaveEdit(game.id, 'breakAfter')} onKeyDown={(e) => handleKeyPress(e, game.id, 'breakAfter')} autoFocus min="0" style={{ fontSize: '0.875rem', width: '80px' }} />
                ) : (
                  <span 
                    onClick={(e) => !readOnly && handleStartEdit(e, game, 'breakAfter')} 
                    style={{ cursor: readOnly ? 'default' : 'text' }}
                    title={readOnly ? undefined : "Click to edit"}
                  >
                    {game.data.breakAfter || 0}
                  </span>
                )}
              </td>
              <td>
                {readOnly ? (
                  <button 
                    className="btn btn-sm btn-outline-success btn-adaptive"
                    onClick={(e) => {
                      e.stopPropagation();
                      // We'll handle this in ListDesignerApp
                      onSelectNode(game.id);
                    }}
                    title="Enter result"
                  >
                    <i className="bi bi-pencil-square me-2" />
                    <span className="btn-label-adaptive">Result</span>
                  </button>
                ) : (
                  <button 
                    className="btn btn-sm btn-outline-danger btn-adaptive" 
                    onClick={(e) => handleDelete(e, game.id)}
                    title="Delete game"
                  >
                    <i className={`bi ${ICONS.DELETE}`} />
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
});

export default GameTable;