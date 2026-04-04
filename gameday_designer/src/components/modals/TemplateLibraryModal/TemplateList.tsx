import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Button, ListGroup } from 'react-bootstrap';
import { ScheduleTemplate } from '../../../types/api';
import { designerApi } from '../../../api/designerApi';
import { getAllTemplates, TournamentTemplate } from '../../../utils/tournamentTemplates';

export type SelectedTemplate =
  | { type: 'builtin'; template: TournamentTemplate }
  | { type: 'saved'; template: ScheduleTemplate };

interface TemplateListProps {
  selectedId: string | null;
  onSelect: (item: SelectedTemplate) => void;
  searchQuery: string;
  filterScope: 'all' | 'personal' | 'association' | 'global';
}

interface GroupedTemplates {
  personal: ScheduleTemplate[];
  association: ScheduleTemplate[];
  global: ScheduleTemplate[];
}

const SCOPE_LABELS: Record<string, string> = {
  personal: 'My Templates',
  association: 'Association',
  global: 'Community',
};

const SCOPE_ICONS: Record<string, string> = {
  personal: '🔒',
  association: '🏛️',
  global: '🌐',
};

const TemplateList: React.FC<TemplateListProps> = ({ selectedId, onSelect, searchQuery, filterScope }) => {
  const [groups, setGroups] = useState<GroupedTemplates>({ personal: [], association: [], global: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [personal, association, global] = await Promise.all([
        designerApi.listTemplates({ sharing: 'personal', search: searchQuery || undefined }),
        designerApi.listTemplates({ sharing: 'association', search: searchQuery || undefined }),
        designerApi.listTemplates({ sharing: 'global', search: searchQuery || undefined }),
      ]);
      setGroups({
        personal: personal.results,
        association: association.results,
        global: global.results,
      });
    } catch {
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const builtins = getAllTemplates().filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showBuiltins = filterScope === 'all' || filterScope === 'global';
  const showPersonal = filterScope === 'all' || filterScope === 'personal';
  const showAssociation = filterScope === 'all' || filterScope === 'association';
  const showCommunity = filterScope === 'all' || filterScope === 'global';

  return (
    <div className="overflow-auto h-100">
      {showBuiltins && builtins.length > 0 && (
        <>
          <div className="px-3 pt-2 pb-1 text-uppercase text-secondary" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>
            🏆 <span>Tournament Formats</span> <span className="badge bg-secondary ms-1">{builtins.length}</span>
          </div>
          <ListGroup variant="flush">
            {builtins.map(t => {
              const id = `builtin-${t.id}`;
              return (
                <ListGroup.Item
                  key={id}
                  action
                  active={selectedId === id}
                  onClick={() => onSelect({ type: 'builtin', template: t })}
                  className="border-0 py-2 px-3"
                  data-testid={`builtin-template-${t.id}`}
                >
                  🏆 <span>{t.name}</span>
                  <div className="text-muted" style={{ fontSize: 11 }}>Built-in</div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </>
      )}

      {loading && (
        <div data-testid="template-list-loading" className="p-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="placeholder-glow mb-2">
              <span className="placeholder col-8 rounded" style={{ height: 32 }} />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="p-3">
          <Alert variant="danger" className="mb-2">{error}</Alert>
          <Button size="sm" variant="outline-secondary" onClick={fetchTemplates}>Retry</Button>
        </div>
      )}

      {!loading && !error && (['personal', 'association', 'global'] as const).map(scope => {
        const items = groups[scope];
        const show = scope === 'personal' ? showPersonal : scope === 'association' ? showAssociation : showCommunity;
        if (!show || items.length === 0) return null;
        return (
          <React.Fragment key={scope}>
            <div className="px-3 pt-2 pb-1 text-uppercase text-secondary" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>
              {SCOPE_ICONS[scope]} {SCOPE_LABELS[scope]} <span className="badge bg-secondary ms-1">{items.length}</span>
            </div>
            <ListGroup variant="flush">
              {items.map(t => {
                const id = `saved-${t.id}`;
                return (
                  <ListGroup.Item
                    key={id}
                    action
                    active={selectedId === id}
                    onClick={() => onSelect({ type: 'saved', template: t })}
                    className="border-0 py-2 px-3"
                  >
                    {SCOPE_ICONS[scope]} <span>{t.name}</span>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      {scope === 'global'
                        ? `by ${(t as ScheduleTemplate & { created_by_display?: string }).created_by_display ?? 'unknown'}`
                        : t.created_at?.split('T')[0]}
                    </div>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default TemplateList;
