import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, Badge } from 'react-bootstrap';
import TemplateList, { SelectedTemplate } from './TemplateLibraryModal/TemplateList';
import TemplatePreview, { TournamentConfig } from './TemplateLibraryModal/TemplatePreview';
import SaveTemplateSheet from './TemplateLibraryModal/SaveTemplateSheet';
import { designerApi } from '../../api/designerApi';
import { GlobalTeam } from '../../types/flowchart';
import { ScheduleTemplate } from '../../types/api';
import { TournamentTemplate } from '../../utils/tournamentTemplates';
import { NotificationType } from '../../types/designer';

type FilterScope = 'all' | 'personal' | 'association' | 'global';
type Step = 'library' | 'team-picker';

const PILLS: { scope: FilterScope; label: string }[] = [
  { scope: 'all', label: 'All' },
  { scope: 'personal', label: '🔒 My templates' },
  { scope: 'association', label: '🏛️ Association' },
  { scope: 'global', label: '🌐 Community' },
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
    selectedTeamIds: string[];
    generateTeams?: boolean;
  }) => void;
  onGenerateFromSavedTemplate?: (templateId: number, config?: TournamentConfig) => void;
  onSaveTemplate?: (name: string, description: string, sharing: 'PRIVATE' | 'ASSOCIATION' | 'GLOBAL') => Promise<void>;
  onNotify?: (message: string, type: NotificationType, title?: string) => void;
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
  const [applyConfig, setApplyConfig] = useState<TournamentConfig | undefined>();
  const [leagueTeams, setLeagueTeams] = useState<GlobalTeam[]>([]);

  // Team picker state (inlined from TeamPickerStep to avoid dual-modal backdrop conflict)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [localTeams, setLocalTeams] = useState<GlobalTeam[]>([]);

  const handleHide = useCallback(() => {
    setStep('library');
    setSelected(null);
    setSelectedId(null);
    onHide();
  }, [onHide]);

  // Fetch league teams and reset team picker state when entering team-picker step
  useEffect(() => {
    if (step !== 'team-picker') return;
    setSelectedIds([]);
    setLocalTeams([]);
    setCreating(false);
    designerApi.getLeagueTeams(gamedayId)
      .then(teams => setLeagueTeams(
        teams.map((t, i) => ({ id: String(t.id), label: t.name, groupId: null, order: i }))
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

  const handleTeamConfirm = useCallback(async (teamIds: string[]) => {
    if (!selected) return;
    try {
      if (selected.type === 'builtin') {
        const builtin = selected.template as TournamentTemplate;
        onGenerateFromBuiltin?.({
          templateId: builtin.id,
          fieldCount: builtin.fieldOptions[0] ?? 2,
          startTime: applyConfig?.startTime ?? '09:00',
          gameDuration: applyConfig?.gameDuration ?? 15,
          breakDuration: applyConfig?.breakDuration ?? 5,
          selectedTeamIds: teamIds,
          generateTeams: true,
        });
        handleHide();
        return;
      }
      const template = selected.template as ScheduleTemplate;
      onGenerateFromSavedTemplate?.(template.id, applyConfig);
      handleHide();
    } catch (e) {
      console.error('Failed to apply template', e);
      onNotify?.('Failed to apply template', 'error');
    }
  }, [selected, applyConfig, handleHide, onGenerateFromBuiltin, onGenerateFromSavedTemplate, onNotify]);

  const handleAutoGenerateTeams = useCallback(async (count: number): Promise<GlobalTeam[]> => {
    try {
      const results = await designerApi.createTeamsBulk(count);
      return results.map((r, i) => ({ id: String(r.id), label: r.name, groupId: null, order: leagueTeams.length + i }));
    } catch (e) {
      onNotify?.(`Failed to generate teams`, 'error');
      throw e;
    }
  }, [leagueTeams.length, onNotify]);

  const handleAutoGenerate = useCallback(async () => {
    // Compute required teams from selected to avoid ordering dependency on computed const
    const req = selected?.type === 'builtin'
      ? (selected.template as TournamentTemplate).teamCount.min
      : (selected?.template as ScheduleTemplate)?.num_teams ?? 0;
    const count = req - selectedIds.length;
    if (count <= 0) return;
    setCreating(true);
    try {
      const teams = await handleAutoGenerateTeams(count);
      setLocalTeams(prev => [...prev, ...teams]);
      setSelectedIds(prev => [...prev, ...teams.map(t => t.id)]);
    } finally {
      setCreating(false);
    }
  }, [selected, selectedIds.length, handleAutoGenerateTeams]);

  const toggleTeam = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }, []);

  const handleClone = useCallback(async (item: SelectedTemplate) => {
    const srcName = item.type === 'builtin'
      ? (item.template as TournamentTemplate).name
      : (item.template as ScheduleTemplate).name;
    const promptedName = window.prompt('Clone name:', `Copy of ${srcName}`);
    if (!promptedName) return;

    if (item.type === 'saved') {
      await designerApi.cloneTemplate((item.template as ScheduleTemplate).id, { new_name: promptedName });
    } else {
      const builtin = item.template as TournamentTemplate;
      await onSaveTemplate?.(promptedName, `Clone of built-in: ${builtin.name}`, 'PRIVATE');
    }
    // Trigger re-fetch by toggling search query
    setSearchQuery(q => q + '\u200b');
    setTimeout(() => setSearchQuery(q => q.replace('\u200b', '')), 100);
  }, [onSaveTemplate]);

  const handleDelete = useCallback(async (template: ScheduleTemplate) => {
    if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    await designerApi.deleteTemplate(template.id);
    setSelected(null);
    setSelectedId(null);
    setSearchQuery(q => q + ' ');
    setTimeout(() => setSearchQuery(q => q.trim()), 100);
  }, []);

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

  const allTeams = [...leagueTeams, ...localTeams];
  const canConfirm = selectedIds.length >= requiredTeams;

  // Use a single modal throughout the entire flow to avoid backdrop z-index conflicts
  // when two Bootstrap modals transition simultaneously.
  return (
    <>
      <Modal
        show={show}
        onHide={step === 'team-picker' ? () => setStep('library') : handleHide}
        size={step === 'library' ? 'xl' : undefined}
        fullscreen={step === 'library' ? 'lg-down' : undefined}
        centered={step === 'team-picker'}
      >
        {step === 'library' ? (
          <>
            <Modal.Header className="bg-dark text-white">
              <Modal.Title>📚 Template Library</Modal.Title>
              <div className="ms-auto d-flex gap-2 align-items-center">
                <Button size="sm" variant="success" onClick={() => setShowSave(true)}>
                  💾 Save current as template
                </Button>
                <Button size="sm" variant="outline-light" onClick={handleHide}>✕</Button>
              </div>
            </Modal.Header>

            <div className="p-2 border-bottom bg-light d-flex flex-wrap gap-2 align-items-center">
              <InputGroup size="sm" style={{ maxWidth: 260 }}>
                <InputGroup.Text>🔍</InputGroup.Text>
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
          <>
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
              {selectedIds.length < requiredTeams && (
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
              <Button variant="outline-secondary" onClick={() => setStep('library')}>← Back</Button>
              <Button
                variant="primary"
                disabled={!canConfirm}
                onClick={() => handleTeamConfirm(selectedIds.slice(0, requiredTeams))}
              >
                Apply to Gameday →
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      <SaveTemplateSheet
        show={showSave}
        onHide={() => setShowSave(false)}
        onSave={handleSave}
      />
    </>
  );
};

export default TemplateLibraryModal;
