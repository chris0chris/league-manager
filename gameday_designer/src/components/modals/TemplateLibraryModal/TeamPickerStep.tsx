import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, Alert } from 'react-bootstrap';
import { GlobalTeam } from '../../../types/flowchart';
import { designerApi } from '../../../api/designerApi';

interface TeamPickerStepProps {
  requiredTeams: number;
  availableTeams: GlobalTeam[];
  onConfirm: (selectedTeams: GlobalTeam[]) => void;
  onBack: () => void;
  onAutoGenerateTeams?: (count: number) => Promise<GlobalTeam[]>;
  backButtonLabel?: string;
  preselectedTeams?: GlobalTeam[];
}

const TeamPickerStep: React.FC<TeamPickerStepProps> = ({
  requiredTeams, availableTeams, onConfirm, onBack,
  onAutoGenerateTeams, backButtonLabel = 'Back to Library', preselectedTeams = [],
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const preselectedNames = new Set(preselectedTeams.map(t => t.label.toLowerCase()));
    return availableTeams
      .filter(t => preselectedNames.has(t.label.toLowerCase()))
      .map(t => t.id);
  });
  const [creating, setCreating] = useState(false);
  const [localTeams, setLocalTeams] = useState<GlobalTeam[]>([]);
  const [associationFilter, setAssociationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mockTeams, setMockTeams] = useState<boolean>(false);

  useEffect(() => {
    designerApi.getConfig().then(config => setMockTeams(config.mock_teams)).catch(() => setMockTeams(false));
  }, []);

  const allTeams = [...availableTeams, ...localTeams];

  // Get unique associations from available teams
  const associations = Array.from(
    new Map(
      availableTeams
        .filter(t => t.associationAbbr)
        .map(t => [t.associationAbbr, t.associationAbbr])
    ).values()
  ).sort();

  // Filter teams by association/scope and search query
  const filteredTeams = allTeams.filter(team => {
    const matchesSearch = searchQuery === '' || team.label.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (associationFilter === 'all') return true;
    if (associationFilter === 'local') return localTeams.some(lt => lt.id === team.id);
    if (associationFilter === 'other') return availableTeams.some(at => at.id === team.id);
    
    return team.associationAbbr === associationFilter;
  });

  const toggleTeam = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const canConfirm = selectedIds.length >= requiredTeams;

  const handleAutoGenerate = async () => {
    if (!onAutoGenerateTeams) return;
    const count = requiredTeams - selectedIds.length;
    if (count <= 0) return;
    setCreating(true);
    try {
      const teams = await onAutoGenerateTeams(count);
      setLocalTeams(prev => [...prev, ...teams]);
      setSelectedIds(prev => [...prev, ...teams.map(t => t.id)]);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title><i className="bi bi-people me-2"></i>Select Teams</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small mb-3">
          Select at least <strong>{requiredTeams}</strong> teams to apply this template.
          Currently selected: <Badge bg={canConfirm ? 'success' : 'warning'}>{selectedIds.length}</Badge>
        </p>

        <div className="mb-3">
          <input
            type="text"
            className="form-control form-control-sm mb-3"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="d-flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={associationFilter === 'all' ? 'primary' : 'outline-primary'}
              onClick={() => setAssociationFilter('all')}
            >
              All Teams
            </Button>
            <Button
              size="sm"
              variant={associationFilter === 'local' ? 'primary' : 'outline-primary'}
              onClick={() => setAssociationFilter('local')}
            >
              Local Teams
            </Button>
            <Button
              size="sm"
              variant={associationFilter === 'other' ? 'primary' : 'outline-primary'}
              onClick={() => setAssociationFilter('other')}
            >
              Other Teams
            </Button>
            {associations.map(abbr => (
              <Button
                key={abbr}
                size="sm"
                variant={associationFilter === abbr ? 'primary' : 'outline-primary'}
                onClick={() => setAssociationFilter(abbr)}
              >
                {abbr}
              </Button>
            ))}
          </div>
        </div>

        {allTeams.length === 0 && !creating ? (
          <Alert variant="info" className="py-2 small">
            No league teams found. Use "Auto-generate" to create placeholders.
          </Alert>
        ) : filteredTeams.length === 0 ? (
          <Alert variant="warning" className="py-2 small">
            No teams match your search or filter.
          </Alert>
        ) : (
          <div className="d-flex flex-wrap gap-2 mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {filteredTeams.map(team => {
              const isSelected = selectedIds.includes(team.id);
              const isLocal = localTeams.some(lt => lt.id === team.id);
              return (
                <Button
                  key={team.id}
                  size="sm"
                  variant={isSelected ? 'primary' : 'outline-primary'}
                  className="d-flex align-items-center gap-2"
                  style={{
                    fontSize: 13,
                    padding: '8px 14px',
                    transition: 'all 0.1s ease-in-out',
                    opacity: isSelected ? 1 : 0.7
                  }}
                  onClick={() => toggleTeam(team.id)}
                >
                  {isSelected && <i className="bi bi-check"></i>}
                  {isLocal && <i className="bi bi-stars"></i>}
                  <span>{team.label}</span>
                </Button>
              );
            })}
          </div>
        )}

        {onAutoGenerateTeams && selectedIds.length < requiredTeams && mockTeams && (
          <Button
            size="sm"
            variant="outline-primary"
            className="w-100"
            disabled={creating}
            onClick={handleAutoGenerate}
          >
            {creating ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating...</>
            ) : (
              `Auto-generate ${requiredTeams - selectedIds.length} missing teams`
            )}
          </Button>
        )}
      </Modal.Body>
      <Modal.Footer className="bg-light">
        <Button variant="outline-secondary" onClick={onBack}>
          {backButtonLabel === 'Cancel' ? (
            <>{backButtonLabel}</>
          ) : (
            <><i className="bi bi-arrow-left me-2"></i>{backButtonLabel}</>
          )}
        </Button>
        <Button
          variant="primary"
          disabled={!canConfirm}
          onClick={() => {
            const teamMap = new Map(allTeams.map(t => [t.id, t]));
            const selectedTeams = selectedIds.slice(0, requiredTeams)
              .map(id => teamMap.get(id))
              .filter(Boolean) as GlobalTeam[];
            onConfirm(selectedTeams);
          }}
          style={{ minWidth: '150px' }}
        >
          Apply to Gameday <i className="bi bi-arrow-right ms-2"></i>
        </Button>
      </Modal.Footer>
    </>
  );
};

export default TeamPickerStep;
