import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ListDesignerApp from '../ListDesignerApp';
import { useDesignerController } from '../../hooks/useDesignerController';
import type { FlowNode, FlowEdge, GlobalTeam, GlobalTeamGroup } from '../../types/flowchart';

// Mock the hook
vi.mock('../../hooks/useDesignerController');

describe('ListDesignerApp Coverage', () => {
  const mockHandlers = {
    handleHighlightElement: vi.fn(),
    handleDynamicReferenceClick: vi.fn(),
    handleImport: vi.fn(),
    handleExport: vi.fn(),
    handleClearAll: vi.fn(),
    handleUpdateNode: vi.fn(),
    handleDeleteNode: vi.fn(),
    handleAddFieldContainer: vi.fn(),
    handleAddStage: vi.fn(),
    handleSelectNode: vi.fn(),
    handleAddGlobalTeam: vi.fn(),
    handleUpdateGlobalTeam: vi.fn(),
    handleDeleteGlobalTeam: vi.fn(),
    handleReorderGlobalTeam: vi.fn(),
    handleAddGlobalTeamGroup: vi.fn(),
    handleAssignTeam: vi.fn(),
    handleGenerateTournament: vi.fn(),
    setShowTournamentModal: vi.fn(),
    dismissNotification: vi.fn(),
  };

  const defaultMockReturn = {
    nodes: [] as FlowNode[],
    edges: [] as FlowEdge[],
    globalTeams: [] as GlobalTeam[],
    globalTeamGroups: [] as GlobalTeamGroup[],
    selectedNode: null,
    validation: { isValid: true, errors: [], warnings: [] },
    notifications: [],
    ui: {
      highlightedElement: null,
      expandedFieldIds: new Set(),
      expandedStageIds: new Set(),
      showTournamentModal: false,
      canExport: false,
      hasNodes: false,
    },
    handlers: mockHandlers,
    updateGlobalTeamGroup: vi.fn(),
    deleteGlobalTeamGroup: vi.fn(),
    reorderGlobalTeamGroup: vi.fn(),
    getTeamUsage: vi.fn(),
    addGameToGameEdge: vi.fn(),
    removeGameToGameEdge: vi.fn(),
    addGameNodeInStage: vi.fn(),
    addNotification: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles clicking on error in popover', async () => {
    const mockValidation = {
      isValid: false,
      errors: [
        { id: 'err1', type: 'field_overlap', message: 'Overlap error', affectedNodes: ['game1'] }
      ],
      warnings: []
    };

    (useDesignerController as any).mockReturnValue({
      ...defaultMockReturn,
      validation: mockValidation,
    });

    render(<ListDesignerApp />);

    // Click on error summary to open popover
    const errorSummary = screen.getByText(/1 error/i);
    fireEvent.click(errorSummary);

    // Click on the error item in popover
    await waitFor(() => {
      const errorItem = screen.getByText('Overlap error');
      fireEvent.click(errorItem);
    });

    expect(mockHandlers.handleHighlightElement).toHaveBeenCalledWith('game1', 'game');
  });

  it('handles clicking on warning in popover', async () => {
    const mockValidation = {
      isValid: true,
      errors: [],
      warnings: [
        { id: 'warn1', type: 'stage_sequence_type', message: 'Stage warning', affectedNodes: ['stage1'] }
      ]
    };

    (useDesignerController as any).mockReturnValue({
      ...defaultMockReturn,
      validation: mockValidation,
    });

    render(<ListDesignerApp />);

    // Click on warning summary to open popover
    const warningSummary = screen.getByText(/1 warning/i);
    fireEvent.click(warningSummary);

    // Click on the warning item in popover
    await waitFor(() => {
      const warningItem = screen.getByText('Stage warning');
      fireEvent.click(warningItem);
    });

    expect(mockHandlers.handleHighlightElement).toHaveBeenCalledWith('stage1', 'stage');
  });

  it('correctly maps highlight types for different error categories', async () => {
    const mockValidation = {
      isValid: false,
      errors: [
        { id: 'err1', type: 'team_overlap', message: 'Team overlap', affectedNodes: ['game1'] },
        { id: 'err2', type: 'stage_outside_field', message: 'Stage error', affectedNodes: ['stage1'] },
        { id: 'err3', type: 'field_overlap', message: 'Field error', affectedNodes: ['game2'] },
        { id: 'err4', type: 'team_outside_container', message: 'Team parent error', affectedNodes: ['team1'] },
      ],
      warnings: []
    };

    (useDesignerController as any).mockReturnValue({
      ...defaultMockReturn,
      validation: mockValidation,
    });

    render(<ListDesignerApp />);

    fireEvent.click(screen.getByText(/4 errors/i));

    await waitFor(() => {
      fireEvent.click(screen.getByText('Team overlap'));
      expect(mockHandlers.handleHighlightElement).toHaveBeenLastCalledWith('game1', 'game');

      fireEvent.click(screen.getByText('Stage error'));
      expect(mockHandlers.handleHighlightElement).toHaveBeenLastCalledWith('stage1', 'stage');

      fireEvent.click(screen.getByText('Field error'));
      expect(mockHandlers.handleHighlightElement).toHaveBeenLastCalledWith('game2', 'game');

      fireEvent.click(screen.getByText('Team parent error'));
      expect(mockHandlers.handleHighlightElement).toHaveBeenLastCalledWith('team1', 'team');
    });
  });
});
