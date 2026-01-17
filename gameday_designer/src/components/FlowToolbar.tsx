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
import { Button, ButtonGroup, ButtonToolbar, Dropdown, DropdownButton } from 'react-bootstrap';
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
  /** Callback to publish the schedule */
  onPublish?: () => void;
  /** Callback to unlock the schedule for editing */
  onUnlock?: () => void;
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
  onPublish,
  onUnlock,
  gamedayStatus = 'DRAFT',
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
        onNotify?.(t('error:invalidScheduleFormat', { errors: 'Invalid JSON' }), 'danger', 'Import Error');
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

  const handleClearAll = () => {
    onClearAll();
  };

  const handleDeleteGameday = () => {
    onDeleteGameday?.();
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
            disabled={gamedayStatus !== 'DRAFT'}
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
              disabled={!canUndo || gamedayStatus !== 'DRAFT'}
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
              disabled={!canRedo || gamedayStatus !== 'DRAFT'}
              title={t('ui:tooltip.redo')}
              data-testid="redo-button"
              className="btn-adaptive"
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              <span className="btn-label-adaptive">{t('ui:button.redo')}</span>
            </Button>
          </ButtonGroup>
        )}

        {/* Lifecycle & Actions Dropdown */}
        <ButtonGroup className="me-2">
          <DropdownButton
            variant="outline-primary"
            title={<span><i className="bi bi-gear-fill me-2"></i>{t('ui:button.actions', 'Actions')}</span>}
            id="designer-actions-dropdown"
            className="btn-adaptive"
          >
            {gamedayStatus === 'DRAFT' ? (
              <Dropdown.Item 
                onClick={(e) => {
                  e.stopPropagation();
                  onPublish?.();
                }}
                className="text-success"
              >
                <i className="bi bi-send-fill me-3"></i>
                {t('ui:button.publishSchedule', 'Publish Schedule')}
              </Dropdown.Item>
            ) : (
              <Dropdown.Item 
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlock?.();
                }}
                className="text-warning"
              >
                <i className="bi bi-unlock-fill me-3"></i>
                {t('ui:button.unlockSchedule', 'Unlock Schedule')}
              </Dropdown.Item>
            )}
            
            <Dropdown.Divider />
            
            <Dropdown.Item 
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              disabled={!hasNodes || gamedayStatus !== 'DRAFT'}
              className="text-warning"
            >
              <i className={`bi ${ICONS.CLEAR} me-3`}></i>
              {t('ui:button.clearSchedule', 'Clear Schedule')}
            </Dropdown.Item>
            
            <Dropdown.Item 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteGameday();
              }}
              className="text-danger"
            >
              <i className={`bi ${ICONS.TRASH} me-3`}></i>
              {t('ui:button.deleteGameday', 'Delete Gameday')}
            </Dropdown.Item>
          </DropdownButton>
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
