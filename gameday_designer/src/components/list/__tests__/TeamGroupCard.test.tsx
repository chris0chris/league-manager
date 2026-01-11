/**
 * Tests for TeamGroupCard Component
 *
 * Tests the team group card UI including:
 * - Group display and expansion
 * - Add Team button within each group
 * - Team display and management within groups
 * - Inline editing and reordering
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamGroupCard from '../TeamGroupCard';
import type { GlobalTeam, GlobalTeamGroup } from '../../../types/flowchart';

describe('TeamGroupCard', () => {
  // Mock data
  const mockGroup: GlobalTeamGroup = {
    id: 'group-1',
    name: 'Group A',
    order: 0,
  };

  const mockTeams: GlobalTeam[] = [
    { id: 'team-1', label: 'Team 1', groupId: 'group-1', order: 0, color: '#3498db' },
    { id: 'team-2', label: 'Team 2', groupId: 'group-1', order: 1, color: '#e74c3c' },
  ];

  const mockAllGroups: GlobalTeamGroup[] = [
    mockGroup,
    { id: 'group-2', name: 'Group B', order: 1 },
  ];

  // Mock functions
  let mockOnUpdateGroup: ReturnType<typeof vi.fn>;
  let mockOnDeleteGroup: ReturnType<typeof vi.fn>;
  let mockOnReorderGroup: ReturnType<typeof vi.fn>;
  let mockOnUpdateTeam: ReturnType<typeof vi.fn>;
  let mockOnDeleteTeam: ReturnType<typeof vi.fn>;
  let mockOnReorderTeam: ReturnType<typeof vi.fn>;
  let mockOnAddTeam: ReturnType<typeof vi.fn>;
  let mockGetTeamUsage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdateGroup = vi.fn();
    mockOnDeleteGroup = vi.fn();
    mockOnReorderGroup = vi.fn();
    mockOnUpdateTeam = vi.fn();
    mockOnDeleteTeam = vi.fn();
    mockOnReorderTeam = vi.fn();
    mockOnAddTeam = vi.fn();
    mockGetTeamUsage = vi.fn(() => []);
  });

  const getDefaultProps = () => ({
    group: mockGroup,
    teams: mockTeams,
    allGroups: mockAllGroups,
    onUpdateGroup: mockOnUpdateGroup,
    onDeleteGroup: mockOnDeleteGroup,
    onReorderGroup: mockOnReorderGroup,
    onUpdateTeam: mockOnUpdateTeam,
    onDeleteTeam: mockOnDeleteTeam,
    onReorderTeam: mockOnReorderTeam,
    onAddTeam: mockOnAddTeam,
    getTeamUsage: mockGetTeamUsage,
    index: 0,
    totalGroups: 2,
  });

  it('renders group name and team count', () => {
    render(<TeamGroupCard {...getDefaultProps()} />);
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('Team 2')).toBeInTheDocument();
  });

  it('toggles expansion when clicking header', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...getDefaultProps()} />);

    const header = screen.getByText('Group A').closest('.card-header');
    await user.click(header!);
    
    // After collapsing, teams should not be visible
    expect(screen.queryByText('Team 1')).toBeNull();

    await user.click(header!);
    expect(screen.getByText('Team 1')).toBeInTheDocument();
  });

  it('allows editing group name via double-click', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...getDefaultProps()} />);

    const groupName = screen.getByText('Group A');
    await user.dblClick(groupName);

    const input = screen.getByDisplayValue('Group A');
    await user.clear(input);
    await user.type(input, 'New Group Name{Enter}');

    expect(mockOnUpdateGroup).toHaveBeenCalledWith('group-1', { name: 'New Group Name' });
  });

  it('cancels group name editing on Escape', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...getDefaultProps()} />);

    const groupName = screen.getByText('Group A');
    await user.dblClick(groupName);

    const input = screen.getByDisplayValue('Group A');
    await user.type(input, 'New Name{Escape}');

    expect(mockOnUpdateGroup).not.toHaveBeenCalled();
    expect(screen.getByText('Group A')).toBeInTheDocument();
  });

  it('allows editing team label via double-click', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...getDefaultProps()} />);

    const teamLabel = screen.getByText('Team 1');
    await user.dblClick(teamLabel);

    const input = screen.getByDisplayValue('Team 1');
    await user.clear(input);
    await user.type(input, 'New Team Name{Enter}');

    expect(mockOnUpdateTeam).toHaveBeenCalledWith('team-1', { label: 'New Team Name' });
  });

  it('changes team color via input', () => {
    render(<TeamGroupCard {...getDefaultProps()} />);

    const colorInputs = screen.getAllByTitle('Change the color badge for this team');
    fireEvent.change(colorInputs[0], { target: { value: '#ff0000' } });

    expect(mockOnUpdateTeam).toHaveBeenCalledWith('team-1', { color: '#ff0000' });
  });

  it('calls onReorderGroup when clicking reorder buttons', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...getDefaultProps()} index={1} totalGroups={3} />);

    const upButton = screen.getByTitle(/move.*group.*up/i);
    const downButton = screen.getByTitle(/move.*group.*down/i);

    await user.click(upButton);
    expect(mockOnReorderGroup).toHaveBeenCalledWith('group-1', 'up');

    await user.click(downButton);
    expect(mockOnReorderGroup).toHaveBeenCalledWith('group-1', 'down');
  });

  it('calls onReorderTeam when clicking reorder team buttons', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...getDefaultProps()} />);

    // Click down on first team
    // Specific regex to avoid matching "team group"
    const downButtons = screen.getAllByTitle(/^Move this team one position down$/i);
    await user.click(downButtons[0]);
    expect(mockOnReorderTeam).toHaveBeenCalledWith('team-1', 'down');

    // Click up on second team
    const upButtons = screen.getAllByTitle(/^Move this team one position up$/i);
    await user.click(upButtons[1]);
    expect(mockOnReorderTeam).toHaveBeenCalledWith('team-2', 'up');
  });

  it('calls onDeleteTeam when clicking delete button', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...getDefaultProps()} />);

    const deleteButtons = screen.getAllByTitle(/^Permanently remove this team from the pool$/i);
    await user.click(deleteButtons[0]);

    expect(mockOnDeleteTeam).toHaveBeenCalledWith('team-1');
  });

  it('calls onDeleteGroup when clicking group delete button', async () => {
    const user = userEvent.setup();
    render(<TeamGroupCard {...getDefaultProps()} />);

    const deleteButton = screen.getByTitle(/^Permanently remove this team group and all its teams$/i);
    await user.click(deleteButton);

    expect(mockOnDeleteGroup).toHaveBeenCalledWith('group-1');
  });

  it('displays correct highlight when team is highlighted', () => {
    const { container } = render(
      <TeamGroupCard
        {...getDefaultProps()}
        highlightedElement={{ id: 'team-1', type: 'team' }}
      />
    );

    const teamRow = container.querySelector('#team-team-1');
    expect(teamRow).toHaveClass('element-highlighted');
  });

  it('shows empty state message when group has no teams', () => {
    render(<TeamGroupCard {...getDefaultProps()} teams={[]} />);
    expect(screen.getByText(/No teams in this group/i)).toBeInTheDocument();
  });
});