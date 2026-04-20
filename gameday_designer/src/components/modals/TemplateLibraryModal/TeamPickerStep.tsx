import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { GlobalTeam } from '../../../types/flowchart';

interface TeamPickerStepProps {
  show: boolean;
  requiredTeams: number;
  availableTeams: GlobalTeam[];
  onConfirm: (selectedTeamIds: string[]) => void;
  onBack: () => void;
  onAutoGenerateTeams?: (count: number) => Promise<GlobalTeam[]>;
}

const TeamPickerStep: React.FC<TeamPickerStepProps> = ({
  show, requiredTeams, availableTeams, onConfirm, onBack,
  onAutoGenerateTeams,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [localTeams, setLocalTeams] = useState<GlobalTeam[]>([]);

  useEffect(() => {
    if (show) {
      Promise.resolve().then(() => {
        setSelectedIds([]);
        setLocalTeams([]);
        setCreating(false);
      });
    }
  }, [show]);

  const allTeams = [...availableTeams, ...localTeams];

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
    <Modal show={show} onHide={onBack} centered>
      <Modal.Header closeButton>
        <Modal.Title>Select Teams</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small mb-3">
          {selectedIds.length} of {requiredTeams} required selected
        </p>
        <div className="d-flex flex-wrap gap-2">
          {allTeams.map(team => (
            <Badge
              key={team.id}
              bg={selectedIds.includes(team.id) ? 'primary' : 'light'}
              text={selectedIds.includes(team.id) ? 'white' : 'dark'}
              style={{ cursor: 'pointer', fontSize: 13, padding: '6px 12px' }}
              onClick={() => toggleTeam(team.id)}
            >
              {team.label}
            </Badge>
          ))}
        </div>

        {onAutoGenerateTeams && selectedIds.length < requiredTeams && (
          <Button
            size="sm"
            variant="outline-secondary"
            className="mt-2"
            disabled={creating}
            onClick={handleAutoGenerate}
          >
            {creating ? '...' : `Auto-generate ${requiredTeams - selectedIds.length} teams`}
          </Button>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onBack}>← Back</Button>
        <Button
          variant="primary"
          disabled={!canConfirm}
          onClick={() => onConfirm(selectedIds.slice(0, requiredTeams))}
        >
          Apply to Gameday →
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TeamPickerStep;
