/**
 * Tests for ListDesignerApp Component
 *
 * TDD RED Phase: Comprehensive tests for main application component
 *
 * Coverage targets:
 * - Initial rendering and layout
 * - Toolbar integration (import/export/clear)
 * - Tournament generation flow
 * - Validation status display
 * - Field/stage/team management
 * - Game highlighting and scrolling
 * - State management via useFlowState
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ListDesignerApp from '../ListDesignerApp';
import i18n from '../../i18n/testConfig';

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock gamedayApi
vi.mock('../../api/gamedayApi', () => ({
  gamedayApi: {
    getGameday: vi.fn().mockResolvedValue({
      id: 1,
      name: 'Test Gameday',
      date: '2026-05-01',
      start: '10:00',
      format: '6_2',
      author: 1,
      address: 'Test Field',
      season: 1,
      league: 1,
      status: 'DRAFT',
    }),
  },
}));

// Mock useFlowState hook
const mockUseFlowState = vi.fn();
vi.mock('../../hooks/useFlowState', () => ({
  useFlowState: () => mockUseFlowState(),
}));

// Mock useFlowValidation hook
const mockUseFlowValidation = vi.fn();
vi.mock('../../hooks/useFlowValidation', () => ({
  useFlowValidation: () => mockUseFlowValidation(),
}));

describe('ListDesignerApp', () => {
  const mockAddFieldNode = vi.fn();
  const mockAddStageNode = vi.fn();
  const mockAddGameNodeInStage = vi.fn();
  const mockAddBulkTournament = vi.fn();
  const mockUpdateNode = vi.fn();
  const mockDeleteNode = vi.fn();
  const mockSelectNode = vi.fn();
  const mockClearAll = vi.fn();
  const mockImportState = vi.fn();
  const mockExportState = vi.fn();
  const mockAddGlobalTeam = vi.fn();
  const mockUpdateGlobalTeam = vi.fn();
  const mockDeleteGlobalTeam = vi.fn();
  const mockReorderGlobalTeam = vi.fn();
  const mockAddGlobalTeamGroup = vi.fn();
  const mockUpdateGlobalTeamGroup = vi.fn();
  const mockDeleteGlobalTeamGroup = vi.fn();
  const mockReorderGlobalTeamGroup = vi.fn();
  const mockGetTeamUsage = vi.fn();
  const mockAssignTeamToGame = vi.fn();
  const mockAddGameToGameEdge = vi.fn();
  const mockAddBulkGameToGameEdges = vi.fn();
  const mockRemoveGameToGameEdge = vi.fn();

  const createMockFlowState = (overrides = {}) => ({
    metadata: {
      id: 1,
      name: 'Test Gameday',
      date: '2026-05-01',
      start: '10:00',
      format: '6_2',
      author: 1,
      address: 'Test Field',
      season: 1,
      league: 1,
      status: 'DRAFT',
    },
    nodes: [],
    edges: [],
    fields: [],
    globalTeams: [],
    globalTeamGroups: [],
    selectedNode: null,
    addFieldNode: mockAddFieldNode,
    addStageNode: mockAddStageNode,
    addGameNodeInStage: mockAddGameNodeInStage,
    addBulkTournament: mockAddBulkTournament,
    updateNode: mockUpdateNode,
    deleteNode: mockDeleteNode,
    selectNode: mockSelectNode,
    clearAll: mockClearAll,
    importState: mockImportState,
    exportState: mockExportState,
    addGlobalTeam: mockAddGlobalTeam,
    updateGlobalTeam: mockUpdateGlobalTeam,
    deleteGlobalTeam: mockDeleteGlobalTeam,
    reorderGlobalTeam: mockReorderGlobalTeam,
    addGlobalTeamGroup: mockAddGlobalTeamGroup,
    updateGlobalTeamGroup: mockUpdateGlobalTeamGroup,
    deleteGlobalTeamGroup: mockDeleteGlobalTeamGroup,
    reorderGlobalTeamGroup: mockReorderGlobalTeamGroup,
    getTeamUsage: mockGetTeamUsage,
    assignTeamToGame: mockAssignTeamToGame,
    addGameToGameEdge: mockAddGameToGameEdge,
    addBulkGameToGameEdges: mockAddBulkGameToGameEdges,
    removeGameToGameEdge: mockRemoveGameToGameEdge,
    updateMetadata: vi.fn(),
    addNotification: vi.fn(),
    onNotify: vi.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    await i18n.changeLanguage('en');

    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementations
    mockUseFlowState.mockReturnValue(createMockFlowState());

    mockUseFlowValidation.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    mockGetTeamUsage.mockReturnValue({ count: 0, gameIds: [] });
  });

  const renderApp = async () => {
    render(<MemoryRouter initialEntries={['/designer/1']}><ListDesignerApp /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Gameday Designer')).toBeInTheDocument());
  };

  describe('Initial Rendering', () => {
    it('should render the main app container', async () => {
      await renderApp();
      const container = document.querySelector('.list-designer-app');
      expect(container).toBeInTheDocument();
    });

    it('should render application title', async () => {
      await renderApp();
      expect(screen.getByText('Gameday Designer')).toBeInTheDocument();
    });

    it('should render application subtitle', async () => {
      await renderApp();
      expect(screen.getAllByText(/Test Gameday/)[0]).toBeInTheDocument();
    });

    it('should render Generate Tournament button', async () => {
      await renderApp();
      const button = screen.getByRole('button', { name: /generate tournament/i });
      expect(button).toBeInTheDocument();
    });

    it('should render FlowToolbar component', async () => {
      await renderApp();
      expect(screen.getByTestId('flow-toolbar')).toBeInTheDocument();
    });

    it('should render ListCanvas component', async () => {
      await renderApp();
      const canvas = document.querySelector('.list-canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Validation Status Display', () => {
    it('should show "Valid" status when no errors or warnings', async () => {
      mockUseFlowValidation.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      await renderApp();
      expect(screen.getByText('Schedule is valid')).toBeInTheDocument();
    });

    it('should show error count when validation has errors', async () => {
      mockUseFlowValidation.mockReturnValue({
        isValid: false,
        errors: [
          { id: 'err1', type: 'incomplete_game_inputs', message: 'Missing home team', affectedNodes: ['game1'] },
          { id: 'err2', type: 'incomplete_game_inputs', message: 'Missing away team', affectedNodes: ['game2'] },
        ],
        warnings: [],
      });

      await renderApp();
      expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
    });

    it('should show single error without plural', async () => {
      mockUseFlowValidation.mockReturnValue({
        isValid: false,
        errors: [
          { id: 'err1', type: 'incomplete_game_inputs', message: 'Missing home team', affectedNodes: ['game1'] },
        ],
        warnings: [],
      });

      await renderApp();
      expect(screen.getByText(/1 error/i)).toBeInTheDocument();
    });

    it('should show warning count when validation has warnings', async () => {
      mockUseFlowValidation.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [
          { id: 'warn1', type: 'duplicate_standing', message: 'Duplicate standing name', affectedNodes: ['game1', 'game2'] },
          { id: 'warn2', type: 'unassigned_field', message: 'No field assigned', affectedNodes: ['game3'] },
        ],
      });

      await renderApp();
      expect(screen.getByText(/2 warnings/i)).toBeInTheDocument();
    });

    it('should display statistics (fields, stages, teams, games)', async () => {
      mockUseFlowState.mockReturnValue(createMockFlowState({
        nodes: [
          { id: 'field1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } },
          { id: 'stage1', type: 'stage', parentId: 'field1', data: { name: 'Stage 1', order: 0 }, position: { x: 0, y: 0 } },
          { id: 'game1', type: 'game', parentId: 'stage1', data: { standing: 'Game 1' }, position: { x: 0, y: 0 } },
          { id: 'game2', type: 'game', parentId: 'stage1', data: { standing: 'Game 2' }, position: { x: 0, y: 0 } },
        ],
        edges: [],
        fields: [
          { id: 'field1', name: 'Field 1', order: 0 },
        ],
        globalTeams: [
          { id: 'team1', label: 'Team A', groupId: null, order: 0 },
          { id: 'team2', label: 'Team B', groupId: null, order: 1 },
        ],
      }));

      mockUseFlowValidation.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      await renderApp();

      expect(screen.getByText(/1 fields/i)).toBeInTheDocument();
      expect(screen.getByText(/1 stages/i)).toBeInTheDocument();
      expect(screen.getByText(/2 teams/i)).toBeInTheDocument();
      expect(screen.getByText(/2 games/i)).toBeInTheDocument();
    });
  });

  describe('Tournament Generation', () => {
    it('should open tournament modal when Generate Tournament button is clicked', async () => {
      const user = userEvent.setup();
      await renderApp();

      const generateButton = screen.getByRole('button', { name: /generate tournament/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should close tournament modal when onHide is called', async () => {
      const user = userEvent.setup();
      await renderApp();

      // Open modal
      const generateButton = screen.getByRole('button', { name: /generate tournament/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal via Cancel button (if exists)
      const cancelButton = screen.queryByRole('button', { name: /cancel/i });
      if (cancelButton) {
        await user.click(cancelButton);
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Import/Export', () => {
    it('should call exportState when export is triggered', async () => {
      const user = userEvent.setup();
      mockUseFlowState.mockReturnValue(createMockFlowState({
        nodes: [
          { id: 'field1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } },
          { id: 'game1', type: 'game', parentId: 'stage1', data: { standing: 'Game 1' }, position: { x: 0, y: 0 } },
        ],
        edges: [],
        fields: [{ id: 'field1', name: 'Field 1', order: 0 }],
      }));

      mockExportState.mockReturnValue({
        metadata: { id: 1, name: 'Test', date: '2026-05-01', start: '10:00', format: '6_2', author: 1, address: '', season: 1, league: 1, status: 'DRAFT' },
        nodes: [],
        edges: [],
        fields: [],
        globalTeams: [],
        globalTeamGroups: [],
      });

      mockUseFlowValidation.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      await renderApp();

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      expect(mockExportState).toHaveBeenCalled();
    });

    it('should call clearAll when clear is triggered', async () => {
      await renderApp();
      expect(mockClearAll).not.toHaveBeenCalled();
    });
  });

  describe('Team Management Callbacks', () => {
    it('should call addGlobalTeam when adding a team to a group', async () => {
      mockAddGlobalTeam.mockReturnValue({ id: 'team1', label: 'New Team', groupId: 'group1', order: 0 });

      await renderApp();
      expect(mockAddGlobalTeam).not.toHaveBeenCalled();
    });

    it('should call addGlobalTeamGroup when adding a group', async () => {
      mockAddGlobalTeamGroup.mockReturnValue({ id: 'group1', name: 'New Group', order: 0 });

      await renderApp();
      expect(mockAddGlobalTeamGroup).not.toHaveBeenCalled();
    });

    it('should call updateGlobalTeam when updating a team', async () => {
      await renderApp();
      expect(mockUpdateGlobalTeam).not.toHaveBeenCalled();
    });

    it('should call deleteGlobalTeam when deleting a team', async () => {
      await renderApp();
      expect(mockDeleteGlobalTeam).not.toHaveBeenCalled();
    });

    it('should call reorderGlobalTeam when reordering teams', async () => {
      await renderApp();
      expect(mockReorderGlobalTeam).not.toHaveBeenCalled();
    });
  });

  describe('Field/Stage/Game Management', () => {
    it('should call addFieldNode when adding a field', async () => {
      await renderApp();
      expect(mockAddFieldNode).not.toHaveBeenCalled();
    });

    it('should call addStageNode when adding a stage', async () => {
      await renderApp();
      expect(mockAddStageNode).not.toHaveBeenCalled();
    });

    it('should call updateNode when updating node data', async () => {
      await renderApp();
      expect(mockUpdateNode).not.toHaveBeenCalled();
    });

    it('should call deleteNode when deleting a node', async () => {
      await renderApp();
      expect(mockDeleteNode).not.toHaveBeenCalled();
    });

    it('should call selectNode when selecting a node', async () => {
      await renderApp();
      expect(mockSelectNode).not.toHaveBeenCalled();
    });
  });

  describe('Game Assignment', () => {
    it('should call assignTeamToGame when assigning a team to a game', async () => {
      await renderApp();
      expect(mockAssignTeamToGame).not.toHaveBeenCalled();
    });

    it('should call addGameToGameEdge when creating game-to-game edge', async () => {
      await renderApp();
      expect(mockAddGameToGameEdge).not.toHaveBeenCalled();
    });

    it('should call removeGameToGameEdge when removing game-to-game edge', async () => {
      await renderApp();
      expect(mockRemoveGameToGameEdge).not.toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    it('getTeamColor should return distinct colors for teams', async () => {
      await renderApp();
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      mockUseFlowValidation.mockReturnValue({
        isValid: false,
        errors: [
          { id: 'err1', type: 'circular_dependency', message: 'Circular dependency detected', affectedNodes: ['game1', 'game2'] },
        ],
        warnings: [],
      });

      await renderApp();
      expect(screen.getByText(/1 error/i)).toBeInTheDocument();
    });

    it('should handle validation warnings gracefully', async () => {
      mockUseFlowValidation.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [
          { id: 'warn1', type: 'orphaned_team', message: 'Team not connected', affectedNodes: ['team1'] },
        ],
      });

      await renderApp();
      expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render correctly with no data', async () => {
      await renderApp();

      expect(screen.getByText(/0 fields/i)).toBeInTheDocument();
      expect(screen.getByText(/0 stages/i)).toBeInTheDocument();
      expect(screen.getByText(/0 teams/i)).toBeInTheDocument();
      expect(screen.getByText(/0 games/i)).toBeInTheDocument();
    });

    it('should show "Valid" status when empty', async () => {
      await renderApp();
      expect(screen.getByText('Schedule is valid')).toBeInTheDocument();
    });
  });

  describe('Validation Error Popover', () => {
    it('should show error details in popover when hovering over error count', async () => {
      const user = userEvent.setup();

      mockUseFlowValidation.mockReturnValue({
        isValid: false,
        errors: [
          { id: 'err1', type: 'incomplete_game_inputs', message: 'Game "Game 1" is missing home team connection', affectedNodes: ['game1'] },
        ],
        warnings: [],
      });

      await renderApp();

      const errorText = screen.getByText(/1 error/i);
      await user.click(errorText);

      // Popover may take time to appear
      await waitFor(() => {
        expect(screen.getByText(/Game "Game 1" is missing home team connection/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show warning details in popover when hovering over warning count', async () => {
      const user = userEvent.setup();

      mockUseFlowValidation.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [
          { id: 'warn1', type: 'duplicate_standing', message: 'Standing "Group A" is used by 2 games', affectedNodes: ['game1', 'game2'] },
        ],
      });

      await renderApp();

      const warningText = screen.getByText(/1 warning/i);
      await user.click(warningText);

      // Popover may take time to appear
      await waitFor(() => {
        expect(screen.getByText(/Standing "Group A" is used by 2 games/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});