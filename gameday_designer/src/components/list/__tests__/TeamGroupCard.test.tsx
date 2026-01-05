/**
 * Tests for TeamGroupCard Component
 *
 * Tests the team group card UI including:
 * - Group display and expansion
 * - Add Team button within each group
 * - Team display and management within groups
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
    { id: 'team-1', label: 'Team 1', groupId: 'group-1', order: 0 },
    { id: 'team-2', label: 'Team 2', groupId: 'group-1', order: 1 },
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

  it('renders group name and team count', () => {
    render(
      <TeamGroupCard
        group={mockGroup}
        teams={mockTeams}
        allGroups={mockAllGroups}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onUpdateTeam={mockOnUpdateTeam}
        onDeleteTeam={mockOnDeleteTeam}
        onReorderTeam={mockOnReorderTeam}
        onAddTeam={mockOnAddTeam}
        getTeamUsage={mockGetTeamUsage}
        index={0}
        totalGroups={2}
      />
    );

    expect(screen.getByText('Group A')).toBeInTheDocument();
    // Team count badge has been removed from the design
    // Just verify the teams are rendered
    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('Team 2')).toBeInTheDocument();
  });

  it('renders Add Team button in group header', () => {
    render(
      <TeamGroupCard
        group={mockGroup}
        teams={mockTeams}
        allGroups={mockAllGroups}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onUpdateTeam={mockOnUpdateTeam}
        onDeleteTeam={mockOnDeleteTeam}
        onReorderTeam={mockOnReorderTeam}
        onAddTeam={mockOnAddTeam}
        getTeamUsage={mockGetTeamUsage}
        index={0}
        totalGroups={2}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add Team/i });
    expect(addButton).toBeInTheDocument();
  });

  it('calls onAddTeam with groupId when Add Team button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TeamGroupCard
        group={mockGroup}
        teams={mockTeams}
        allGroups={mockAllGroups}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onUpdateTeam={mockOnUpdateTeam}
        onDeleteTeam={mockOnDeleteTeam}
        onReorderTeam={mockOnReorderTeam}
        onAddTeam={mockOnAddTeam}
        getTeamUsage={mockGetTeamUsage}
        index={0}
        totalGroups={2}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add Team/i });
    await user.click(addButton);

    expect(mockOnAddTeam).toHaveBeenCalledWith('group-1');
    expect(mockOnAddTeam).toHaveBeenCalledTimes(1);
  });

  it('shows "Add Team" button even when group is collapsed', () => {
    render(
      <TeamGroupCard
        group={mockGroup}
        teams={mockTeams}
        allGroups={mockAllGroups}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onUpdateTeam={mockOnUpdateTeam}
        onDeleteTeam={mockOnDeleteTeam}
        onReorderTeam={mockOnReorderTeam}
        onAddTeam={mockOnAddTeam}
        getTeamUsage={mockGetTeamUsage}
        index={0}
        totalGroups={2}
      />
    );

    // Initially expanded, collapse it
    const header = screen.getByText('Group A').closest('.card-header');
    fireEvent.click(header!);

    // Add Team button should still be visible in header
    expect(screen.getByRole('button', { name: /Add Team/i })).toBeInTheDocument();
  });

  it('shows empty state message when group has no teams', () => {
    render(
      <TeamGroupCard
        group={mockGroup}
        teams={[]}
        allGroups={mockAllGroups}
        onUpdateGroup={mockOnUpdateGroup}
        onDeleteGroup={mockOnDeleteGroup}
        onReorderGroup={mockOnReorderGroup}
        onUpdateTeam={mockOnUpdateTeam}
        onDeleteTeam={mockOnDeleteTeam}
        onReorderTeam={mockOnReorderTeam}
        onAddTeam={mockOnAddTeam}
        getTeamUsage={mockGetTeamUsage}
        index={0}
        totalGroups={2}
      />
    );

    expect(screen.getByText(/No teams in this group/i)).toBeInTheDocument();
  });
});
