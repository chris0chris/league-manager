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
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  hasNodes = false,
  canExport = false,
}) => {
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
        alert('Failed to parse JSON file. Please ensure it is valid JSON.');
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

  return (
    <div className="flow-toolbar" data-testid="flow-toolbar">
      <ButtonToolbar>
        {/* Import/Export buttons */}
        <ButtonGroup className="me-2">
          <Button
            variant="outline-secondary"
            onClick={handleImportClick}
            title="Import from JSON file"
            data-testid="import-button"
          >
            <i className="bi bi-upload me-1"></i>
            Import
          </Button>
          <Button
            variant="outline-secondary"
            onClick={onExport}
            disabled={!canExport}
            title="Export to JSON file"
            data-testid="export-button"
          >
            <i className="bi bi-download me-1"></i>
            Export
          </Button>
        </ButtonGroup>

        {/* Undo/Redo buttons */}
        {(onUndo || onRedo) && (
          <ButtonGroup className="me-2">
            <Button
              variant="outline-secondary"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              data-testid="undo-button"
            >
              <i className="bi bi-arrow-counterclockwise"></i>
            </Button>
            <Button
              variant="outline-secondary"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              data-testid="redo-button"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </Button>
          </ButtonGroup>
        )}

        {/* Clear all button */}
        <ButtonGroup>
          <Button
            variant="outline-danger"
            onClick={handleClearAll}
            disabled={!hasNodes}
            title="Clear all nodes and edges"
            data-testid="clear-all-button"
          >
            <i className="bi bi-trash me-1"></i>
            Clear All
          </Button>
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
