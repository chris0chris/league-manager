import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import TemplateList, { SelectedTemplate } from './TemplateLibraryModal/TemplateList';
import TemplatePreview, { TournamentConfig } from './TemplateLibraryModal/TemplatePreview';
import TeamPickerStep from './TemplateLibraryModal/TeamPickerStep';
import SaveTemplateSheet from './TemplateLibraryModal/SaveTemplateSheet';
import { designerApi } from '../../api/designerApi';
import { GlobalTeam } from '../../types/flowchart';
import { ScheduleTemplate } from '../../types/api';
import { TournamentTemplate } from '../../utils/tournamentTemplates';
import { NotificationType } from '../../types/designer';
import { getTeamColor } from '../../utils/tournamentConstants';

type FilterScope = 'all' | 'personal' | 'association' | 'global';
type Step = 'library' | 'team-picker';

const PILLS: { scope: FilterScope; label: React.ReactNode }[] = [
  { scope: 'all', label: 'All' },
  { scope: 'personal', label: <><i className="bi bi-lock me-2"></i>My templates</> },
  { scope: 'association', label: <><i className="bi bi-bank me-2"></i>Association</> },
  { scope: 'global', label: <><i className="bi bi-globe me-2"></i>Community</> },
];

interface TemplateLibraryModalProps {
  show: boolean;
  onHide: () => void;
  gamedayId: number;
  currentUserId: number;
  onScheduleApplied?: () => void;
  onGenerateFromBuiltin?: (config: {
    templateId: string;
    fieldCount: number;
    startTime: string;
    gameDuration: number;
    breakDuration: number;
    selectedTeams: GlobalTeam[];
    generateTeams: boolean;
  }) => void;
  onGenerateFromSavedTemplate?: (templateId: number, config: TournamentConfig | undefined, selectedTeams: GlobalTeam[]) => void;
  onSaveTemplate?: (name: string, description: string, sharing: 'PRIVATE' | 'ASSOCIATION' | 'GLOBAL') => Promise<void>;
  onNotify?: (message: string, type: NotificationType, title?: string, onConfirm?: () => void, timeout?: number) => void;
}

const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({
  show, onHide, gamedayId, currentUserId,
  onGenerateFromBuiltin, onGenerateFromSavedTemplate, onSaveTemplate, onNotify,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<FilterScope>('all');
  const [step, setStep] = useState<Step>('library');
  const [showSave, setShowSave] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneItem, setCloneItem] = useState<SelectedTemplate | null>(null);
  const [applyConfig, setApplyConfig] = useState<TournamentConfig | undefined>();
  const [leagueTeams, setLeagueTeams] = useState<GlobalTeam[]>([]);

  const handleHide = useCallback(() => {
    setStep('library');
    setSelected(null);
    setSelectedId(null);
    onHide();
  }, [onHide]);

  // Fetch league teams when entering team-picker step
  useEffect(() => {
    if (step !== 'team-picker') return;
    designerApi.getLeagueTeams(gamedayId)
      .then(teams => setLeagueTeams(
        teams.map((t, i) => ({
          id: String(t.id),
          label: t.name,
          groupId: null,
          order: i,
          color: getTeamColor(i),
          associationAbbr: t.association_abbr ?? null
        }))
      ))
      .catch(() => onNotify?.('Failed to load league teams', 'error'));
  }, [step, gamedayId, onNotify]);

  const handleSelect = useCallback((item: SelectedTemplate) => {
    const id = item.type === 'builtin'
      ? `builtin-${(item.template as TournamentTemplate).id}`
      : `saved-${(item.template as ScheduleTemplate).id}`;
    setSelectedId(id);
    setSelected(item);
  }, []);

  const handleApply = useCallback((item: SelectedTemplate, config?: TournamentConfig) => {
    setApplyConfig(config);
    setStep('team-picker');
  }, []);

  const handleTeamConfirm = useCallback(async (selectedTeams: GlobalTeam[]) => {
    if (!selected) return;

    try {
      if (selected.type === 'builtin') {
        const builtin = selected.template as TournamentTemplate;
        onGenerateFromBuiltin?.({
          templateId: builtin.id,
          fieldCount: applyConfig?.numFields ?? builtin.fieldOptions[0] ?? 2,
          startTime: applyConfig?.startTime ?? '09:00',
          gameDuration: applyConfig?.gameDuration ?? 15,
          breakDuration: applyConfig?.breakDuration ?? 5,
          selectedTeams,
          generateTeams: true,
        });
        handleHide();
        return;
      }
      const template = selected.template as ScheduleTemplate;
      onGenerateFromSavedTemplate?.(template.id, applyConfig, selectedTeams);
      handleHide();
    } catch (e) {
      console.error('Failed to apply template', e);
      onNotify?.('Failed to apply template', 'error');
    }
  }, [selected, applyConfig, handleHide, onGenerateFromBuiltin, onGenerateFromSavedTemplate, onNotify]);

  const handleAutoGenerateTeams = useCallback(async (count: number): Promise<GlobalTeam[]> => {
    try {
      const results = await designerApi.createTeamsBulk(count);
      return results.map((r, i) => ({ 
        id: String(r.id), 
        label: r.name, 
        groupId: null, 
        order: leagueTeams.length + i,
        color: getTeamColor(leagueTeams.length + i)
      }));
    } catch (e) {
      onNotify?.(`Failed to generate teams`, 'error');
      throw e;
    }
  }, [leagueTeams.length, onNotify]);

  const handleClone = useCallback((item: SelectedTemplate) => {
    const srcName = item.type === 'builtin'
      ? (item.template as TournamentTemplate).name
      : (item.template as ScheduleTemplate).name;
    setCloneName(`Copy of ${srcName}`);
    setCloneItem(item);
    setShowCloneModal(true);
  }, []);

  const executeClone = useCallback(async () => {
    if (!cloneItem || !cloneName) return;

    try {
      if (cloneItem.type === 'saved') {
        await designerApi.cloneTemplate((cloneItem.template as ScheduleTemplate).id, { new_name: cloneName });
      } else {
        const builtin = cloneItem.template as TournamentTemplate;
        await onSaveTemplate?.(cloneName, `Clone of built-in: ${builtin.name}`, 'PRIVATE');
      }
      setShowCloneModal(false);
      setCloneItem(null);
      // Trigger re-fetch by toggling search query
      setSearchQuery(q => q + '\u200b');
      setTimeout(() => setSearchQuery(q => q.replace('\u200b', '')), 100);
      onNotify?.('Template cloned successfully', 'success', 'Success');
    } catch (e) {
      console.error('Failed to clone template', e);
      onNotify?.('Failed to clone template', 'danger', 'Error');
    }
  }, [cloneItem, cloneName, onSaveTemplate, onNotify]);

  const handleDelete = useCallback((template: ScheduleTemplate) => {
    onNotify?.(`Delete "${template.name}"? This cannot be undone.`, 'warning', 'Delete Template', async () => {
      try {
        await designerApi.deleteTemplate(template.id);
        setSelected(null);
        setSelectedId(null);
        setSearchQuery(q => q + ' ');
        setTimeout(() => setSearchQuery(q => q.trim()), 100);
        onNotify?.('Template deleted successfully', 'success', 'Success');
      } catch (e) {
        console.error('Failed to delete template', e);
        onNotify?.('Failed to delete template', 'danger', 'Error');
      }
    }, 10000);
  }, [onNotify]);

  const handleSave = useCallback(async (data: { name: string; description: string; sharing: 'PRIVATE' | 'ASSOCIATION' | 'GLOBAL' }) => {
    try {
      await onSaveTemplate?.(data.name, data.description, data.sharing);
    } catch {
      onNotify?.('Failed to save template', 'error');
      return;
    }
    setShowSave(false);
    setSearchQuery(q => q + '\u200b');
    setTimeout(() => setSearchQuery(q => q.replace('\u200b', '')), 100);
  }, [onSaveTemplate, onNotify]);

  const requiredTeams = selected?.type === 'builtin'
    ? (selected.template as TournamentTemplate).teamCount.min
    : (selected?.template as ScheduleTemplate)?.num_teams ?? 0;

  return (
    <>
      <Modal
        show={show}
        onHide={step === 'team-picker' ? () => setStep('library') : handleHide}
        size={step === 'library' ? 'xl' : undefined}
        fullscreen={step === 'library' ? 'lg-down' : undefined}
        centered
        dialogClassName="template-library-modal"
      >
        {step === 'library' ? (
          <>
            <Modal.Header className="bg-dark text-white">
              <Modal.Title><i className="bi bi-book-half me-2"></i>Template Library</Modal.Title>
              <div className="ms-auto d-flex gap-2 align-items-center">
                <Button size="sm" variant="success" onClick={() => setShowSave(true)}>
                  <i className="bi bi-download me-2"></i>Save current as template
                </Button>
                <Button size="sm" variant="outline-light" onClick={handleHide} aria-label="Close" data-testid="close-template-library-button">
                  <i className="bi bi-x-lg"></i>
                </Button>
              </div>
            </Modal.Header>

            <div className="p-2 border-bottom bg-light d-flex flex-wrap gap-2 align-items-center">
              <InputGroup size="sm" style={{ maxWidth: 260 }}>
                <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                <Form.Control
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </InputGroup>
              {PILLS.map(pill => (
                <Button
                  key={pill.scope}
                  size="sm"
                  variant={filterScope === pill.scope ? 'primary' : 'outline-secondary'}
                  className="rounded-pill"
                  onClick={() => setFilterScope(pill.scope)}
                >
                  {pill.label}
                </Button>
              ))}
            </div>

            <Modal.Body className="p-0 d-flex" style={{ height: '60vh' }}>
              <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid #dee2e6' }}>
                <TemplateList
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  searchQuery={searchQuery}
                  filterScope={filterScope}
                />
              </div>
              <div className="flex-grow-1">
                <TemplatePreview
                  key={selectedId ?? 'none'}
                  selected={selected}
                  currentUserId={currentUserId}
                  onApply={handleApply}
                  onClone={handleClone}
                  onDelete={handleDelete}
                  onSave={() => setShowSave(true)}
                />
              </div>
            </Modal.Body>
          </>
        ) : (
          <TeamPickerStep
            requiredTeams={requiredTeams}
            availableTeams={leagueTeams}
            onBack={() => setStep('library')}
            onConfirm={handleTeamConfirm}
            onAutoGenerateTeams={handleAutoGenerateTeams}
          />
        )}
      </Modal>

      <SaveTemplateSheet
        show={showSave}
        onHide={() => setShowSave(false)}
        onSave={handleSave}
      />

      <Modal show={showCloneModal} onHide={() => setShowCloneModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Clone Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>New Template Name</Form.Label>
            <Form.Control
              type="text"
              value={cloneName}
              onChange={e => setCloneName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && executeClone()}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCloneModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={executeClone} disabled={!cloneName.trim()}>Clone</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TemplateLibraryModal;
