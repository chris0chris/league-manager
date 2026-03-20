import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, ListGroup, InputGroup, Spinner } from 'react-bootstrap';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import { gamedayApi } from '../../api/gamedayApi';
import { ICONS } from '../../utils/iconConstants';

export interface TeamSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelect: (team: { id: number; text: string }) => void;
  groupId: string;
  title?: string;
}

const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({
  show,
  onHide,
  onSelect,
  title,
}) => {
  const { t } = useTypedTranslation(['modal', 'ui']);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!show) {
      setQuery('');
      setResults([]);
    }
  }, [show]);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const teams = await gamedayApi.searchTeams(searchQuery);
        setResults(teams);
      } catch (error) {
        console.error('Failed to search teams:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || t('modal:teamSelection.title', 'Connect Existing Team')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder={t('modal:teamSelection.placeholder', 'Search by team name...')}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            <InputGroup.Text>
              {loading ? <Spinner animation="border" size="sm" /> : <i className={`bi ${ICONS.SEARCH}`} />}
            </InputGroup.Text>
          </InputGroup>
        </Form.Group>

        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {results.length > 0 ? (
            <ListGroup variant="flush">
              {results.map((team) => (
                <ListGroup.Item
                  key={team.id}
                  action
                  onClick={() => {
                    onSelect(team);
                    onHide();
                  }}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>{team.text}</span>
                  <small className="text-muted">ID: {team.id}</small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : query && !loading ? (
            <div className="text-center py-3 text-muted">
              {t('modal:teamSelection.noResults', 'No teams found matching your search.')}
            </div>
          ) : (
            <div className="text-center py-3 text-muted small">
              {t('modal:teamSelection.hint', 'Enter at least 2 characters to search.')}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('ui:button.cancel')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TeamSelectionModal;
