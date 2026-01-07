/**
 * Tests for GlobalTeamTable Component
 *
 * Tests the group-based global team pool UI including:
 * - Team grouping and ungrouped teams
 * - Inline editing for teams and groups
 * - Team reordering within groups
 * - Moving teams between groups
 * - Group management (add, delete, reorder)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalTeamTable from '../GlobalTeamTable';
import type { GlobalTeam, GlobalTeamGroup, FlowNode } from '../../../types/flowchart';

describe('GlobalTeamTable', () => {
  // Mock data
  const mockGroups: GlobalTeamGroup[] = [
    { id: 'group-1', name: 'Group A', order: 0 },
    { id: 'group-2', name: 'Group B', order: 1 },
  ];

  const mockTeams: GlobalTeam[] = [
    { id: 'team-1', label: 'Team 1', groupId: 'group-1', order: 0 },
    { id: 'team-2', label: 'Team 2', groupId: 'group-1', order: 1 },
    { id: 'team-3', label: 'Team 3', groupId: 'group-2', order: 2 },
    { id: 'team-4', label: 'Team 4', groupId: null, order: 3 },
  ];

  const mockNodes: FlowNode[] = [];

  // Mock functions
  let mockOnAddGroup: ReturnType<typeof vi.fn>;
  let mockOnUpdateGroup: ReturnType<typeof vi.fn>;
  let mockOnDeleteGroup: ReturnType<typeof vi.fn>;
  let mockOnReorderGroup: ReturnType<typeof vi.fn>;
  let mockOnAddTeam: ReturnType<typeof vi.fn>;
  let mockOnUpdate: ReturnType<typeof vi.fn>;
  let mockOnDelete: ReturnType<typeof vi.fn>;
  let mockOnReorder: ReturnType<typeof vi.fn>;
  let mockGetTeamUsage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAddGroup = vi.fn();
    mockOnUpdateGroup = vi.fn();
    mockOnDeleteGroup = vi.fn();
    mockOnReorderGroup = vi.fn();
    mockOnAddTeam = vi.fn();
    mockOnUpdate = vi.fn();
    mockOnDelete = vi.fn();
    mockOnReorder = vi.fn();
    mockGetTeamUsage = vi.fn(() => []);
  });

  it('renders empty state when no groups exist', () => {
    render(
      <GlobalTeamTable
        teams={[]}
        groups={[]}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    expect(screen.getByText(/No groups yet/i)).toBeInTheDocument();
  });

  it('renders "Add Group" button', () => {
    // Add Group button only appears in empty state
    render(
      <GlobalTeamTable
        teams={[]}
        groups={[]}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add Group/i });
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);
    expect(mockOnAddGroup).toHaveBeenCalledTimes(1);
  });

  it('renders groups with team count badge', () => {
    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // Just verify groups are rendered
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('Group B')).toBeInTheDocument();

    // Note: Team count badges have been removed from the current design
    // The design now shows teams directly in expanded groups
  });

  it('expands and collapses groups on click', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // Initially expanded - teams should be visible
    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('Team 2')).toBeInTheDocument();

    // Find and click Group A header to collapse
    const groupAHeader = screen.getByText('Group A').closest('.card-header');
    expect(groupAHeader).toBeInTheDocument();

    await user.click(groupAHeader!);

    // Teams should now be hidden
    expect(screen.queryByText('Team 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Team 2')).not.toBeInTheDocument();
  });

  it('allows editing group name via double-click', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    const groupName = screen.getByText('Group A');
    await user.dblClick(groupName);

    // Input should appear
    const input = screen.getByDisplayValue('Group A');
    expect(input).toBeInTheDocument();

    // Change the name
    await user.clear(input);
    await user.type(input, 'New Group Name');

    // Blur to save
    fireEvent.blur(input);

    expect(mockOnUpdateGroup).toHaveBeenCalledWith('group-1', { name: 'New Group Name' });
  });

  it('allows editing team label via double-click', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // Groups are expanded by default, so teams are visible
    const teamLabel = screen.getByText('Team 1');
    await user.dblClick(teamLabel);

    // Input should appear
    const input = screen.getByDisplayValue('Team 1');
    expect(input).toBeInTheDocument();

    // Change the name
    await user.clear(input);
    await user.type(input, 'New Team Name');

    // Blur to save
    fireEvent.blur(input);

    expect(mockOnUpdate).toHaveBeenCalledWith('team-1', { label: 'New Team Name' });
  });

  it('displays team usage count', () => {
    mockGetTeamUsage.mockImplementation((teamId: string) => {
      if (teamId === 'team-1') {
        return [
          { gameId: 'game-1', slot: 'home' },
          { gameId: 'game-2', slot: 'away' },
        ];
      }
      return [];
    });

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // Groups are expanded by default, so team usage is visible
    // Find Team 1 row and check usage count
    const team1Row = screen.getByText('Team 1').closest('div[class*="d-flex"]');
    expect(within(team1Row!).getByText('2')).toBeInTheDocument();
  });

  it('calls onReorder when reorder buttons are clicked', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // Groups are expanded by default
    // Find Team 2 row
    const team2Row = screen.getByText('Team 2').closest('div[class*="d-flex"]');
    expect(team2Row).toBeInTheDocument();

    // Find up button (second team in group, so up button should be enabled)
    const upButtons = within(team2Row!).getAllByRole('button', { name: /Move up/i });
    await user.click(upButtons[0]);

    expect(mockOnReorder).toHaveBeenCalledWith('team-2', 'up');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // Groups are expanded by default
    // Find Team 1 row
    const team1Row = screen.getByText('Team 1').closest('div[class*="d-flex"]');

    // Find and click delete button
    const deleteButtons = within(team1Row!).getAllByRole('button', { name: /Delete team/i });
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('team-1');
  });

  it('calls onDeleteGroup when group delete button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // Find Group A header
    const groupAHeader = screen.getByText('Group A').closest('.card-header');

    // Find delete button in header
    const deleteButton = within(groupAHeader!).getByRole('button', { name: /Delete group/i });
    await user.click(deleteButton);

    expect(mockOnDeleteGroup).toHaveBeenCalledWith('group-1');
  });

  it('calls onReorderGroup when group reorder buttons are clicked', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // Find Group B header (second group, so down button should be disabled)
    const groupBHeader = screen.getByText('Group B').closest('.card-header');

    // Find up button
    const upButton = within(groupBHeader!).getByRole('button', { name: /Move group up/i });
    await user.click(upButton);

    expect(mockOnReorderGroup).toHaveBeenCalledWith('group-2', 'up');
  });

  it('disables reorder buttons appropriately', () => {
    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    // First group's up button should be disabled
    const groupAHeader = screen.getByText('Group A').closest('.card-header');
    const groupAUpButton = within(groupAHeader!).getByRole('button', { name: /Move group up/i });
    expect(groupAUpButton).toBeDisabled();

    // Last group's down button should be disabled
    const groupBHeader = screen.getByText('Group B').closest('.card-header');
    const groupBDownButton = within(groupBHeader!).getByRole('button', { name: /Move group down/i });
    expect(groupBDownButton).toBeDisabled();
  });

  it('shows empty state when no groups exist', () => {
    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={[]}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    expect(screen.getByText(/No groups yet/i)).toBeInTheDocument();
  });

  // NEW TESTS FOR REFACTORED BEHAVIOR
  describe('Refactored behavior - teams must be in groups', () => {
    it('does not render "Ungrouped Teams" section', () => {
      const teamsWithoutUngrouped = mockTeams.filter(t => t.groupId !== null);

      render(
        <GlobalTeamTable
          teams={teamsWithoutUngrouped}
          groups={mockGroups}
          onAddGroup={mockOnAddGroup}
          onUpdateGroup={mockOnUpdateGroup}
          onDeleteGroup={mockOnDeleteGroup}
          onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onReorder={mockOnReorder}
          getTeamUsage={mockGetTeamUsage}
          allNodes={mockNodes}
        />
      );

      expect(screen.queryByText('Ungrouped Teams')).not.toBeInTheDocument();
    });

    it('shows correct empty state message when no groups exist', () => {
      render(
        <GlobalTeamTable
          teams={[]}
          groups={[]}
          onAddGroup={mockOnAddGroup}
          onUpdateGroup={mockOnUpdateGroup}
          onDeleteGroup={mockOnDeleteGroup}
          onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onReorder={mockOnReorder}
          getTeamUsage={mockGetTeamUsage}
          allNodes={mockNodes}
        />
      );

      // Check for the actual text that appears
      expect(screen.getByText(/No groups yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Create your first team group to organize teams/i)).toBeInTheDocument();
    });

    it('does not show move to "Ungrouped" option in team dropdown', async () => {
      const user = userEvent.setup();

      render(
        <GlobalTeamTable
          teams={mockTeams}
          groups={mockGroups}
          onAddGroup={mockOnAddGroup}
          onUpdateGroup={mockOnUpdateGroup}
          onDeleteGroup={mockOnDeleteGroup}
          onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onReorder={mockOnReorder}
          getTeamUsage={mockGetTeamUsage}
          allNodes={mockNodes}
        />
      );

      // Groups are expanded by default
      // Find Team 1 row and open the move dropdown (the folder icon button)
      const team1Row = screen.getByText('Team 1').closest('div[class*="d-flex"]');
      const dropdownButtons = within(team1Row!).getAllByRole('button');
      // The dropdown button should be the one with the folder icon (4th button: up, down, folder, delete)
      const dropdownToggle = dropdownButtons.find(btn => btn.querySelector('.bi-folder-fill'));
      expect(dropdownToggle).toBeDefined();
      await user.click(dropdownToggle!);

      // "Ungrouped" option should not exist
      expect(screen.queryByText('Ungrouped')).not.toBeInTheDocument();
    });
  });

  it('handles Enter key to save group name edit', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    const groupName = screen.getByText('Group A');
    await user.dblClick(groupName);

    const input = screen.getByDisplayValue('Group A');
    await user.clear(input);
    await user.type(input, 'New Name{Enter}');

    expect(mockOnUpdateGroup).toHaveBeenCalledWith('group-1', { name: 'New Name' });
  });

  it('handles Escape key to cancel group name edit', async () => {
    const user = userEvent.setup();

    render(
      <GlobalTeamTable
        teams={mockTeams}
        groups={mockGroups}
        onAddGroup={mockOnAddGroup}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onAddTeam={mockOnAddTeam}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onReorder={mockOnReorder}
        getTeamUsage={mockGetTeamUsage}
        allNodes={mockNodes}
      />
    );

    const groupName = screen.getByText('Group A');
    await user.dblClick(groupName);

    const input = screen.getByDisplayValue('Group A');
    await user.clear(input);
    await user.type(input, 'New Name{Escape}');

    // Should not call update
    expect(mockOnUpdateGroup).not.toHaveBeenCalled();

    // Input should be gone
    expect(screen.queryByDisplayValue('New Name')).not.toBeInTheDocument();
  });
});
