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

  const renderTable = (props = {}) => {
    return render(
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
        {...props}
      />
    );
  };

  it('renders empty state when no groups exist', () => {
    renderTable({ groups: [], teams: [] });
    expect(screen.getByText(/No groups yet/i)).toBeInTheDocument();
  });

  it('renders "Add Group" button', () => {
    renderTable({ groups: [], teams: [] });
    const addButton = screen.getByRole('button', { name: /Add Group/i });
    expect(addButton).toBeInTheDocument();

    fireEvent.click(addButton);
    expect(mockOnAddGroup).toHaveBeenCalledTimes(1);
  });

  it('renders groups', () => {
    renderTable();
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('Group B')).toBeInTheDocument();
  });

  it('expands and collapses groups on click', async () => {
    const user = userEvent.setup();
    renderTable();

    // Initially expanded - teams should be visible
    expect(screen.getByText('Team 1')).toBeInTheDocument();

    // Find and click Group A header to collapse
    const groupAHeader = screen.getByText('Group A').closest('.card-header');
    await user.click(groupAHeader!);

    // Teams should now be hidden
    expect(screen.queryByText('Team 1')).not.toBeInTheDocument();
  });

  it('allows editing group name via double-click', async () => {
    const user = userEvent.setup();
    renderTable();

    const groupName = screen.getByText('Group A');
    await user.dblClick(groupName);

    const input = screen.getByDisplayValue('Group A');
    await user.clear(input);
    await user.type(input, 'New Group Name');
    fireEvent.blur(input);

    expect(mockOnUpdateGroup).toHaveBeenCalledWith('group-1', { name: 'New Group Name' });
  });

  it('displays team usage count', () => {
    mockGetTeamUsage.mockReturnValue([{ gameId: 'g1', slot: 'home' }]);
    renderTable();
    const team1Row = screen.getByText('Team 1').closest('div.d-flex');
    expect(within(team1Row!).getByText('1')).toBeInTheDocument();
  });

  it('calls onReorder when reorder buttons are clicked', async () => {
    const user = userEvent.setup();
    renderTable();

    const team2Row = screen.getByText('Team 2').closest('div.d-flex');
    const upButton = within(team2Row!).getByTitle(/Move this team one position up/i);
    await user.click(upButton);

    expect(mockOnReorder).toHaveBeenCalledWith('team-2', 'up');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    renderTable({ teams: mockTeams, groups: mockGroups, onDelete: mockOnDelete });

    const team1Row = screen.getByText('Team 1').closest('div.d-flex');
    const deleteButton = within(team1Row!).getByTitle(/Permanently remove this team from the pool/i);
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('team-1');
  });

  it('calls onDeleteGroup when group delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDeleteGroup = vi.fn();
    renderTable({ teams: mockTeams, groups: mockGroups, onDeleteGroup: mockOnDeleteGroup });

    const groupAHeader = screen.getByText('Group A').closest('.card-header');
    const deleteButton = within(groupAHeader!).getByTitle(/Permanently remove this team group and all its teams/i);
    await user.click(deleteButton);

    expect(mockOnDeleteGroup).toHaveBeenCalledWith('group-1');
  });

  it('calls onReorderGroup when group reorder buttons are clicked', async () => {
    const user = userEvent.setup();
    const mockOnReorderGroup = vi.fn();
    renderTable({ teams: mockTeams, groups: mockGroups, onReorderGroup: mockOnReorderGroup });

    const groupBHeader = screen.getByText('Group B').closest('.card-header');
    const upButton = within(groupBHeader!).getByTitle(/Move this team group one position up/i);
    await user.click(upButton);

    expect(mockOnReorderGroup).toHaveBeenCalledWith('group-2', 'up');
  });

  it('disables reorder buttons appropriately', () => {
    renderTable();
    const groupAHeader = screen.getByText('Group A').closest('.card-header');
    const groupAUpButton = within(groupAHeader!).getByTitle(/Move this team group one position up/i);
    expect(groupAUpButton).toBeDisabled();
  });

  describe('Refactored behavior - teams must be in groups', () => {
    it('does not render "Ungrouped Teams" section', () => {
      renderTable({ teams: mockTeams.filter(t => t.groupId !== null) });
      expect(screen.queryByText('Ungrouped Teams')).not.toBeInTheDocument();
    });

    it('does not show move to "Ungrouped" option in team dropdown', async () => {
      const user = userEvent.setup();
      renderTable();

      const team1Row = screen.getByText('Team 1').closest('div.d-flex');
      const dropdownToggle = within(team1Row!).getByTitle(/Move this team to a different group/i);
      await user.click(dropdownToggle);

      expect(screen.queryByText('Ungrouped')).not.toBeInTheDocument();
    });
  });
});