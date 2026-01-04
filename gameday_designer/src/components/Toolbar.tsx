/**
 * Toolbar Component
 *
 * Provides action buttons for the Gameday Designer:
 * - Add Field: Adds a new playing field to the canvas
 * - Import: Load existing schedule JSON from file
 * - Export: Download current schedule as JSON
 * - Clear All: Reset the entire canvas (with confirmation)
 */

import React, { useRef, useState } from 'react';
import { Button, ButtonGroup, Modal, Alert } from 'react-bootstrap';
import type { ScheduleJson } from '../types/designer';
import { validateScheduleJson } from '../utils/jsonExport';

export interface ToolbarProps {
  /** Callback when Add Field button is clicked */
  onAddField: () => void;
  /** Callback when valid JSON is imported */
  onImport: (json: ScheduleJson[]) => void;
  /** Callback when Export button is clicked */
  onExport: () => void;
  /** Callback when Clear All is confirmed */
  onClearAll: () => void;
}

/**
 * Toolbar component for the Gameday Designer.
 */
const Toolbar: React.FC<ToolbarProps> = ({
  onAddField,
  onImport,
  onExport,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  /**
   * Handle file selection for import.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const content = reader.result as string;
        const parsed = JSON.parse(content);

        // Validate the JSON structure
        const validation = validateScheduleJson(parsed);
        if (!validation.valid) {
          setImportError(`Invalid schedule format: ${validation.errors.join(', ')}`);
          return;
        }

        setImportError(null);
        onImport(parsed as ScheduleJson[]);
      } catch {
        setImportError('Invalid JSON file. Please select a valid schedule JSON file.');
      }
    };

    reader.onerror = () => {
      setImportError('Error reading file. Please try again.');
    };

    reader.readAsText(file);

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Trigger the hidden file input.
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle Clear All button click.
   */
  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  /**
   * Confirm the clear all action.
   */
  const handleClearConfirm = () => {
    setShowClearConfirm(false);
    onClearAll();
  };

  /**
   * Cancel the clear all action.
   */
  const handleClearCancel = () => {
    setShowClearConfirm(false);
  };

  /**
   * Dismiss import error alert.
   */
  const handleDismissError = () => {
    setImportError(null);
  };

  return (
    <>
      <div className="toolbar mb-3">
        <ButtonGroup>
          <Button variant="primary" onClick={onAddField}>
            <i className="bi bi-plus-lg me-1"></i>
            Add Field
          </Button>
          <Button variant="secondary" onClick={handleImportClick}>
            <i className="bi bi-upload me-1"></i>
            Import
          </Button>
          <Button variant="secondary" onClick={onExport}>
            <i className="bi bi-download me-1"></i>
            Export
          </Button>
          <Button variant="danger" onClick={handleClearClick}>
            <i className="bi bi-trash me-1"></i>
            Clear All
          </Button>
        </ButtonGroup>

        {/* Hidden file input for importing */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          data-testid="file-input"
        />
      </div>

      {/* Import error alert */}
      {importError && (
        <Alert variant="danger" dismissible onClose={handleDismissError}>
          {importError}
        </Alert>
      )}

      {/* Clear all confirmation modal */}
      <Modal show={showClearConfirm} onHide={handleClearCancel} centered>
        <Modal.Header closeButton>
          <Modal.Title>Clear All</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to clear all fields, stages, games, teams, and groups? This action cannot be
          undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClearCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleClearConfirm}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Toolbar;
