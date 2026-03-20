/**
 * Additional interactive tests for TeamGroupCard
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamGroupCard from '../TeamGroupCard';
import type { GlobalTeam, GlobalTeamGroup } from '../../../types/flowchart';

describe('TeamGroupCard Interaction Fix (#680)', () => {
  // Mock data
  const mockGroup: GlobalTeamGroup = {
    id: 'group-1',
    name: 'Group A',
    order: 0,
  };

  const mockTeams: GlobalTeam[] = [
    { id: 'team-1', label: 'Team 1', groupId: 'group-1', order: 0, color: '#3498db' },
  ];

  const mockAllGroups: GlobalTeamGroup[] = [
    mockGroup,
    { id: 'group-2', name: 'Group B', order: 1 },
  ];

  const mockOnUpdateTeam = vi.fn();
  const mockOnReorderTeam = vi.fn();
  const mockOnUpdateGroup = vi.fn();
  const mockOnAddTeam = vi.fn();

  const defaultProps = {
    group: mockGroup,
    teams: mockTeams,
    allGroups: mockAllGroups,
    onUpdateGroup: mockOnUpdateGroup,
    onDeleteGroup: vi.fn(),
    onReorderGroup: vi.fn(),
    onUpdateTeam: mockOnUpdateTeam,
    onDeleteTeam: vi.fn(),
    onReorderTeam: mockOnReorderTeam,
    onAddTeam: mockOnAddTeam,
    getTeamUsage: vi.fn(() => []),
    index: 0,
    totalGroups: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TDD RED: team reorder buttons should NOT toggle group expansion', async () => {
    const user = userEvent.setup();
    const twoTeams = [
        ...mockTeams,
        { id: 'team-2', label: 'Team 2', groupId: 'group-1', order: 1, color: '#000' }
    ];
    render(<TeamGroupCard {...defaultProps} teams={twoTeams} />);

    // Expansion should be on initially
    expect(screen.getByText('Team 1')).toBeInTheDocument();

    // Click reorder button (should stop propagation)
    const moveButtons = screen.getAllByTitle(/Move this team one position down/i);
    await user.click(moveButtons[0]);

    // If propagation was NOT stopped, the card would collapse and Team 1 would disappear
    expect(screen.queryByText('Team 1')).toBeInTheDocument();
    expect(mockOnReorderTeam).toHaveBeenCalledWith('team-1', 'down');
  });

  it('calls handleMoveTeam when selecting a different group', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...defaultProps} />);

    const moveBtn = screen.getByTitle(/Move this team to a different group/i);
    await user.click(moveBtn);

    const groupBLink = screen.getByText('Group B');
    await user.click(groupBLink);

    expect(mockOnUpdateTeam).toHaveBeenCalledWith('team-1', { groupId: 'group-2' });
  });

  it('renders add team button in empty state', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...defaultProps} teams={[]} />);

    // There are two "Add Team" buttons (header + empty body)
    // Both now search by title as they are icon-only
    const addBtns = screen.getAllByTitle(/add (a new|your first) team/i);
    await user.click(addBtns[1]); // Click the one in the body

    expect(mockOnAddTeam).toHaveBeenCalledWith('group-1');
  });

  it('cancels team label edit on Escape', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...defaultProps} />);

    const teamLabel = screen.getByText('Team 1');
    await user.dblClick(teamLabel);

    const input = screen.getByDisplayValue('Team 1');
    await user.type(input, 'Modified{Escape}');

    expect(mockOnUpdateTeam).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Modified')).not.toBeInTheDocument();
  });

  it('resets group name if empty on blur', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...defaultProps} />);

    const groupName = screen.getByText('Group A');
    await user.dblClick(groupName);

    const input = screen.getByDisplayValue('Group A');
    await user.clear(input);
    fireEvent.blur(input);

    expect(mockOnUpdateGroup).not.toHaveBeenCalled();
    expect(screen.getByText('Group A')).toBeInTheDocument();
  });
});