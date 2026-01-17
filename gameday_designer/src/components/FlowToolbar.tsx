/**
 * FlowToolbar Component
 *
 * Toolbar for the flowchart designer with controls for:
 * - Import/Export JSON
 * - Clear all
 * - Undo/Redo (future)
 *
 * Note: Add buttons have been moved inline to where elements are created
 * (Fields section, Field body, Stage body) for better spatial mapping.
 */

import React, { useRef } from 'react';
import { Button, ButtonGroup, ButtonToolbar } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
import LanguageSelector from './LanguageSelector';
import { ICONS } from '../utils/iconConstants';

import './FlowToolbar.css';

/**
 * Props for the FlowToolbar component.
 */
export interface FlowToolbarProps {
  /** Callback to import from JSON file */
  onImport: (json: unknown) => void;
  /** Callback to export to JSON */
  onExport: () => void;
  /** Callback to clear all nodes and edges */
  onClearAll: () => void;
  /** Callback to delete the entire gameday */
  onDeleteGameday?: () => void;
  /** Callback for notifications */
  onNotify?: (message: string, type: import('../types/designer').NotificationType, title?: string) => void;
  /** Callback for undo action */
  onUndo?: () => void;
  /** Callback for redo action */
  onRedo?: () => void;
  /** Whether undo is available */
  canUndo?: boolean;
  /** Whether redo is available */
  canRedo?: boolean;
  /** Whether there are any nodes to clear */
  hasNodes?: boolean;
  /** Whether export is available (has valid data) */
  canExport?: boolean;
}

/**
 * FlowToolbar component.
 *
 * Provides global actions for the flowchart designer.
 * Add buttons have been moved inline for better UX.
 */
const FlowToolbar: React.FC<FlowToolbarProps> = ({
  onImport,
  onExport,
  onClearAll,
  onDeleteGameday,
  onNotify,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  hasNodes = false,
  canExport = false,
}) => {
  const { t } = useTypedTranslation(['ui']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  /**
   * Handle file input change for import.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);
        onImport(json);
      } catch (error) {
        console.error('Failed to parse JSON file:', error);
        if (onNotify) {
          onNotify(t('error:invalidScheduleFormat', { errors: 'Invalid JSON' }), 'danger', 'Import Error');
        } else {
          alert('Failed to parse JSON file. Please ensure it is valid JSON.');
        }
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be imported again
    event.target.value = '';
  };

  /**
   * Trigger file input click for import.
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle clear all.
   */
  const handleClearAll = () => {
    onClearAll();
  };

  const handleDeleteGameday = () => {
    if (showConfirmDelete) {
      onDeleteGameday?.();
    } else {
      setShowConfirmDelete(true);
      setTimeout(() => setShowConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="flow-toolbar" data-testid="flow-toolbar">
      <ButtonToolbar>
        {/* Import/Export buttons */}
        <ButtonGroup className="me-2">
          <Button
            variant="outline-secondary"
            onClick={handleImportClick}
            title={t('ui:tooltip.importFromJson')}
            data-testid="import-button"
          >
            <i className={`bi ${ICONS.IMPORT}`}></i>
          </Button>
          <Button
            variant="outline-secondary"
            onClick={onExport}
            disabled={!canExport}
            title={t('ui:tooltip.exportToJson')}
            data-testid="export-button"
          >
            <i className={`bi ${ICONS.EXPORT}`}></i>
          </Button>
        </ButtonGroup>

        {/* Undo/Redo buttons */}
        {(onUndo || onRedo) && (
          <ButtonGroup className="me-2">
            <Button
              variant="outline-secondary"
              onClick={onUndo}
              disabled={!canUndo}
              title={t('ui:tooltip.undo')}
              data-testid="undo-button"
              className="btn-adaptive"
            >
              <i className={`bi bi-arrow-counterclockwise me-2`}></i>
              <span className="btn-label-adaptive">{t('ui:button.undo')}</span>
            </Button>
            <Button
              variant="outline-secondary"
              onClick={onRedo}
              disabled={!canRedo}
              title={t('ui:tooltip.redo')}
              data-testid="redo-button"
              className="btn-adaptive"
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              <span className="btn-label-adaptive">{t('ui:button.redo')}</span>
            </Button>
          </ButtonGroup>
        )}

        {/* Actions button group */}
        <ButtonGroup className="me-2">
          {/* Clear schedule button */}
          <Button
            variant="outline-warning"
            onClick={handleClearAll}
            disabled={!hasNodes}
            title={t('ui:button.clearSchedule', 'Clear Schedule')}
            data-testid="clear-all-button"
          >
            <i className={`bi ${ICONS.CLEAR}`}></i>
          </Button>

          {/* Delete gameday button */}
          <Button
            variant="outline-danger"
            onClick={handleDeleteGameday}
            onMouseLeave={() => setShowConfirmDelete(false)}
            title={showConfirmDelete ? "Click again to confirm deletion" : t('ui:button.deleteGameday', 'Delete Gameday')}
            data-testid="delete-gameday-button"
            className="transition-all d-flex align-items-center btn-destructive-hover btn-adaptive"
            style={{ width: showConfirmDelete ? '150px' : 'auto' }}
          >
            <i className={`bi ${ICONS.TRASH} ${showConfirmDelete ? 'me-2' : ''}`}></i>
            <span 
              className="btn-label-adaptive" 
              style={showConfirmDelete ? { maxWidth: '200px', opacity: 1, marginLeft: '0.25rem', fontWeight: 'bold' } : {}}
            >
              {showConfirmDelete ? 'confirm dele' : t('ui:button.deleteGameday', 'Delete Gameday')}
            </span>
          </Button>
        </ButtonGroup>

        {/* Language selector */}
        <ButtonGroup>
          <LanguageSelector />
        </ButtonGroup>
      </ButtonToolbar>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="import-file-input"
      />
    </div>
  );
};

export default FlowToolbar;
