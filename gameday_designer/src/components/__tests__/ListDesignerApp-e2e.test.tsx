/**
 * Definitive E2E Integration Test for Gameday Designer
 * 
 * This test uses REAL hooks (no mocking of useFlowState/useDesignerController)
 * to verify the complete CRUD flow of all elements.
 * Only the API layer is mocked.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ListDesignerApp from '../ListDesignerApp';
import { GamedayProvider } from '../../context/GamedayContext';
import i18n from '../../i18n/testConfig';
import { gamedayApi } from '../../api/gamedayApi';

// Mock react-router-dom partially to keep Routes/Route
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock gamedayApi
vi.mock('../../api/gamedayApi', () => ({
  gamedayApi: {
    getGameday: vi.fn(),
    publish: vi.fn(),
    patchGameday: vi.fn(),
    deleteGameday: vi.fn(),
    updateGameResult: vi.fn(),
  },
}));

describe('ListDesignerApp - E2E CRUD Flow', () => {
  const mockGameday = {
    id: 1,
    name: 'E2E Test Gameday',
    date: '2026-06-01',
    start: '10:00',
    format: '6_2',
    author: 1,
    address: 'E2E Field',
    season: 1,
    league: 1,
    status: 'DRAFT',
    designer_data: {
      nodes: [],
      edges: [],
      fields: [],
      globalTeams: [],
      globalTeamGroups: []
    }
  };

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    
    // Default GET response
    (gamedayApi.getGameday as any).mockResolvedValue(mockGameday);
    // Mock patch to return what it received
    (gamedayApi.patchGameday as any).mockImplementation((id, data) => Promise.resolve({ ...mockGameday, ...data }));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  const renderApp = async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );
    
    // Wait for initial load - spinner gone
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), { timeout: 15000 });
    
    return { user };
  };

  it('verifies the complete CRUD lifecycle of a gameday structure', async () => {
    const { user } = await renderApp();

    // --- 1. FIELD MANAGEMENT (Create/Update) ---
    const addFieldBtn = (await screen.findAllByRole('button', { name: /add field/i }))[0];
    await user.click(addFieldBtn);

    await waitFor(() => expect(screen.getByText(/Feld 1/i)).toBeInTheDocument());
    
    // Update Field Name
    const fieldSection = screen.getByText(/Feld 1/i).closest('.field-section')!;
    const editFieldBtn = within(fieldSection).getByTitle(/edit the name of this playing field/i);
    await user.click(editFieldBtn);
    
    const fieldInput = within(fieldSection).getByDisplayValue(/Feld 1/i);
    await user.clear(fieldInput);
    await user.type(fieldInput, 'Main Stadium{enter}');
    
    await waitFor(() => expect(screen.getByText('Main Stadium')).toBeInTheDocument());

    // --- 2. STAGE MANAGEMENT (Create/Update) ---
    const updatedFieldSection = screen.getByText('Main Stadium').closest('.field-section')!;
    const addStageBtn = within(updatedFieldSection).getByRole('button', { name: /add stage/i });
    await user.click(addStageBtn);
    
    await waitFor(() => expect(screen.getByText(/Preliminary/i)).toBeInTheDocument());
    
    // Update Stage Name
    const stageSection = screen.getByText(/Preliminary/i).closest('.stage-section')!;
    const editStageBtn = within(stageSection).getByTitle(/edit the name of this tournament phase/i);
    await user.click(editStageBtn);
    
    const stageInput = within(stageSection).getByDisplayValue(/Preliminary/i);
    await user.clear(stageInput);
    await user.type(stageInput, 'Opening Round{enter}');
    
    await waitFor(() => expect(screen.getByText('Opening Round')).toBeInTheDocument());

    // --- 3. TEAM MANAGEMENT (Create/Update) ---
    const teamPoolCard = screen.getByText('label.teamPool').closest('.card')!;
    const addGroupBtn = within(teamPoolCard).getAllByRole('button', { name: /add group/i })[0];
    await user.click(addGroupBtn);
    
    await waitFor(() => expect(screen.getByText(/Group 1/i)).toBeInTheDocument());
    
    const groupCard = screen.getByText(/Group 1/i).closest('.card')!;
    const addTeamBtn = within(groupCard).getAllByRole('button', { name: /add team/i })[0];
    await user.click(addTeamBtn);
    
    await waitFor(() => expect(screen.getByText(/Team 1/i)).toBeInTheDocument());

    // Add a second team
    await user.click(addTeamBtn);
    await waitFor(() => expect(screen.getByText(/Team 2/i)).toBeInTheDocument());

    // --- 4. GAME MANAGEMENT (Create/Update/Assign) ---
    const updatedStageSection = screen.getByText('Opening Round').closest('.stage-section')!;
    const addGameBtn = within(updatedStageSection).getAllByRole('button', { name: /add game/i })[0];
    await user.click(addGameBtn);
    
    await waitFor(() => expect(screen.getByText(/Game 1/i)).toBeInTheDocument());
    
    // Assign Teams to Game
    const gameRow = screen.getByText(/Game 1/i).closest('tr')!;
    const teamCombos = within(gameRow).getAllByRole('combobox');
    
    // Home slot
    await user.click(teamCombos[0]);
    const team1Options = await screen.findAllByText(/Team 1/i);
    await user.click(team1Options[team1Options.length - 1]);

    // Away slot
    await user.click(teamCombos[1]);
    const team2Options = await screen.findAllByText(/Team 2/i);
    await user.click(team2Options[team2Options.length - 1]);
    
    // Verify assignment worked (check team usage count)
    await waitFor(() => {
      const usageBadges = screen.getAllByTitle(/Number of games this team is assigned to/i);
      expect(usageBadges[0]).toHaveTextContent('1');
      expect(usageBadges[1]).toHaveTextContent('1');
    });

    // --- 5. LIFECYCLE (Publish/Unlock) ---
    const publishBtn = screen.getAllByRole('button', { name: /Publish/i })[0];
    
    const fullDesignerData = {
      nodes: [
        { id: 'field-1', type: 'field', data: { name: 'Main Stadium' }, position: { x: 0, y: 0 } },
        { id: 'stage-1', type: 'stage', parentId: 'field-1', data: { name: 'Opening Round' }, position: { x: 0, y: 0 } },
        { id: 'game-1', type: 'game', parentId: 'stage-1', data: { standing: 'Game 1' }, position: { x: 0, y: 0 } }
      ],
      fields: [{ id: 'field-1', name: 'Main Stadium', order: 0 }],
      globalTeams: [{ id: 'team-1', label: 'Team 1', groupId: 'group-1', order: 0 }],
      globalTeamGroups: [{ id: 'group-1', name: 'Group 1', order: 0 }],
      edges: []
    };

    (gamedayApi.publish as any).mockImplementation(async (id: number) => {
      mockGameday.status = 'PUBLISHED';
      return { 
        ...mockGameday, 
        status: 'PUBLISHED',
        designer_data: fullDesignerData
      };
    });
    
    await user.click(publishBtn);
    
    // Confirm in modal
    const confirmBtn = await screen.findByRole('button', { name: /Publish Now|Publish Anyway/i });
    await user.click(confirmBtn);
    
    // Wait for modal to disappear
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    
    // Wait for the Unlock button to appear in the accordion body
    const accordionBody = screen.getByText(mockGameday.name).closest('.accordion-item')!;
    const unlockBtn = await within(accordionBody).findByRole('button', { name: /Unlock Schedule/i }, { timeout: 10000 });
    expect(unlockBtn).toBeInTheDocument();
    
    // Confirm state change via badge
    await waitFor(() => expect(screen.getAllByText(/PUBLISHED|Published|Veröffentlicht/i)[0]).toBeInTheDocument());
    
    // Verify locking: Add Field button should be gone (from header)
    const fieldsCard = screen.getByText('Fields').closest('.card')!;
    expect(within(fieldsCard).queryByRole('button', { name: /add field/i })).not.toBeInTheDocument();
    
    // --- 6. RESULT ENTRY (In Published State) ---
    const resultBtn = (await screen.findAllByRole('button', { name: /result/i }))[0];
    await user.click(resultBtn);
    
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getAllByText(/Score/i)[0]).toBeInTheDocument();
    
    // Find input by its id which is halftimeHome in GameResultModal
    const halftimeHomeInput = (await within(modal).findAllByLabelText(/Home/))[0];
    await user.type(halftimeHomeInput, '7');
    
    const saveResultBtn = within(modal).getByRole('button', { name: /Save/i });
    (gamedayApi.updateGameResult as any).mockResolvedValue({
      halftime_score: { home: 7, away: 0 },
      final_score: { home: 7, away: 0 },
      status: 'IN_PROGRESS'
    });
    
    await user.click(saveResultBtn);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // --- 7. DATA INTEGRITY (Unlock & Clear All) ---
    (gamedayApi.patchGameday as any).mockImplementation(async (id: number, data: any) => {
      if (data.status) mockGameday.status = data.status;
      return { 
        ...mockGameday, 
        ...data,
        designer_data: fullDesignerData
      };
    });
    
    const unlockBtnAction = await screen.findByRole('button', { name: /Unlock Schedule/i });
    await user.click(unlockBtnAction);
    await waitFor(() => expect(screen.getAllByText(/DRAFT|Draft|Entwurf/i)[0]).toBeInTheDocument());
    
    const clearBtn = screen.getByText(/Clear Schedule/i);
    await user.click(clearBtn);
    
    // Verify statistics in footer
    await waitFor(() => {
      expect(screen.getByText(/0 Fields/i)).toBeInTheDocument();
      expect(screen.getByText(/0 Stages/i)).toBeInTheDocument();
      expect(screen.getByText(/0 Teams/i)).toBeInTheDocument();
      expect(screen.getByText(/0 Games/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  }, 30000);

  it('blocks publishing when there are validation errors', async () => {
    const { user } = await renderApp();
    
    // Add a field to enable publish button (needs some data)
    const addFieldBtn = (await screen.findAllByRole('button', { name: /add field/i }))[0];
    await user.click(addFieldBtn);

    // Mock validation errors
    vi.mocked(gamedayApi.getGameday).mockResolvedValueOnce({
      ...mockGameday,
      designer_data: {
        nodes: [{ id: 'game-1', type: 'game', data: { standing: 'Game 1' }, position: { x: 0, y: 0 } }],
        fields: [{ id: 'field-1', name: 'Field 1', order: 0 }],
        globalTeams: [],
        globalTeamGroups: [],
        edges: []
      }
    });

    // We can't easily mock the useFlowValidation return directly here because it's a real hook,
    // but we can trigger a state that causes errors (e.g. game with no teams)
    const addGameBtn = (await screen.findAllByRole('button', { name: /add game/i }))[0];
    await user.click(addGameBtn);

    // Click publish
    const publishBtn = screen.getAllByRole('button', { name: /Publish/i })[0];
    await user.click(publishBtn);

    // Verify modal shows error and button is disabled
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/Blocking Errors Found/i)).toBeInTheDocument();
    
    const confirmBtn = within(modal).getByRole('button', { name: /Publish (Now|Anyway)/i });
    expect(confirmBtn).toBeDisabled();
  });
});