import React, { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { designerApi } from '../../api/designerApi';
import TeamPickerStep from './TemplateLibraryModal/TeamPickerStep';
import type { GlobalTeam } from '../../types/flowchart';
import { getTeamColor } from '../../utils/tournamentConstants';
import { v4 as uuidv4 } from 'uuid';

export interface TeamSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelect: (teams: GlobalTeam[]) => void;
  groupId: string;
  gamedayId?: number;
  mode?: 'single' | 'group';
  preselectedTeams?: GlobalTeam[];
}

const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({
  show,
  onHide,
  onSelect,
  gamedayId = 0,
  preselectedTeams = [],
}) => {
  const [availableTeams, setAvailableTeams] = useState<GlobalTeam[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;

    const loadTeams = async () => {
      setLoading(true);
      try {
        const teams = await designerApi.getLeagueTeams(gamedayId);
        const globalTeams = teams.map((t, i) => ({
          id: String(t.id),
          label: t.name,
          groupId: null,
          order: i,
          color: getTeamColor(i),
          associationAbbr: t.association_abbr ?? null
        }));
        setAvailableTeams(globalTeams);
      } catch (error) {
        console.error('Failed to load teams:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [show, gamedayId]);

  const handleConfirm = (selectedTeams: GlobalTeam[]) => {
    onSelect(selectedTeams);
    onHide();
  };

  const handleAutoGenerateTeams = async (count: number): Promise<GlobalTeam[]> => {
    const generated: GlobalTeam[] = [];
    for (let i = 0; i < count; i++) {
      const team: GlobalTeam = {
        id: `team-${uuidv4()}`,
        label: `Generated Team ${i + 1}`,
        groupId: null,
        order: availableTeams.length + i,
        color: getTeamColor((availableTeams.length + i) % 10),
      };
      generated.push(team);
    }
    return generated;
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      {loading ? (
        <div className="text-center p-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <TeamPickerStep
          requiredTeams={1}
          availableTeams={availableTeams}
          onConfirm={handleConfirm}
          onBack={onHide}
          onAutoGenerateTeams={handleAutoGenerateTeams}
          backButtonLabel="Cancel"
          preselectedTeams={preselectedTeams}
        />
      )}
    </Modal>
  );
};

export default TeamSelectionModal;
