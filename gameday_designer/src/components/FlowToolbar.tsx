/**
 * FlowToolbar Component
 *
 * Toolbar for the flowchart designer with controls for:
 * - Import/Export JSON
 * - Undo/Redo
 *
 * Gameday-level actions (Publish, Clear, Delete) have been moved 
 * to the GamedayMetadataAccordion component.
 */

import React, { useRef } from 'react';
import { Button, ButtonGroup, ButtonToolbar, Dropdown } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';
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
  /** Callback to export structured template */
  onExportTemplate?: () => void;
  /** Current gameday status */
  gamedayStatus?: string;
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
  /** Whether export is available (has valid data) */
  canExport?: boolean;
  /** Callback to switch to results mode */
  onResultsMode?: () => void;
  /** Whether results mode is active */
  resultsMode?: boolean;
}

/**
 * FlowToolbar component.
 *
 * Provides global actions for the flowchart designer.
 */
const FlowToolbar: React.FC<FlowToolbarProps> = ({
  onImport,
  onExport,
  onExportTemplate,
  gamedayStatus = 'DRAFT',
  onNotify,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  canExport = false,
  onResultsMode,
  resultsMode = false,
}) => {
  const { t } = useTypedTranslation(['ui']);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        onNotify?.(t('error:invalidScheduleFormat', { errors: 'Invalid JSON' }), 'danger', t('ui:notification.title.importError'));
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

  return (
    <div className="flow-toolbar" data-testid="flow-toolbar">
      <ButtonToolbar>
        {/* Results mode button */}
        {gamedayStatus !== 'DRAFT' && onResultsMode && (
          <ButtonGroup className="me-2">
            <Button
              variant={resultsMode ? "primary" : "outline-primary"}
              onClick={onResultsMode}
              title={resultsMode ? t('ui:button.exitResults') : t('ui:button.enterResults')}
              data-testid="results-mode-button"
            >
              <i className={`bi ${resultsMode ? 'bi-grid' : 'bi-table'} me-1`}></i>
              {resultsMode ? t('ui:button.exitResults') : t('ui:button.enterResults')}
            </Button>
          </ButtonGroup>
        )}

        {/* Import/Export buttons */}
        <ButtonGroup className="me-2">
          <Button
            variant="outline-secondary"
            onClick={handleImportClick}
            title={t('ui:tooltip.importFromJson')}
            data-testid="import-button"
            disabled={gamedayStatus !== 'DRAFT'}
          >
            <i className={`bi ${ICONS.IMPORT}`}></i>
          </Button>
          <Dropdown as={ButtonGroup}>
            <Button
              variant="outline-secondary"
              onClick={onExport}
              disabled={!canExport}
              title={t('ui:tooltip.exportToJson')}
              data-testid="export-button"
            >
              <i className={`bi ${ICONS.EXPORT}`}></i>
            </Button>

            <Dropdown.Toggle 
              split 
              variant="outline-secondary" 
              id="export-dropdown" 
              disabled={!canExport} 
              data-testid="export-dropdown-toggle"
            />

            <Dropdown.Menu>
              <Dropdown.Item onClick={onExport}>
                <i className={`bi ${ICONS.EXPORT} me-2`}></i>
                {t('ui:button.exportSchedule')}
              </Dropdown.Item>
              {onExportTemplate && (
                <Dropdown.Item 
                  onClick={onExportTemplate} 
                  data-testid="export-template-button"
                  title={t('ui:tooltip.exportTemplateToJson')}
                >
                  <i className="bi bi-file-earmark-code me-2"></i>
                  {t('ui:button.exportTemplate')}
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </ButtonGroup>

        {/* Undo/Redo buttons */}
        {(onUndo || onRedo) && (
          <ButtonGroup className="me-2">
            <Button
              variant="outline-secondary"
              onClick={onUndo}
              disabled={!canUndo || gamedayStatus !== 'DRAFT'}
              title={t('ui:tooltip.undo')}
              data-testid="undo-button"
            >
              <i className={`bi ${ICONS.UNDO}`}></i>
            </Button>
            <Button
              variant="outline-secondary"
              onClick={onRedo}
              disabled={!canRedo || gamedayStatus !== 'DRAFT'}
              title={t('ui:tooltip.redo')}
              data-testid="redo-button"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </Button>
          </ButtonGroup>
        )}
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