/**
 * Interaction Tests for TeamGroupCard Component
 * 
 * Verifies that action buttons within the card (reorder, edit, delete)
 * do not bubble events to the header and trigger unintended expansion toggles.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    { id: 'team-2', label: 'Team 2', groupId: 'group-1', order: 1, color: '#e74c3c' },
  ];

  // Mock functions
  let mockOnReorderTeam: ReturnType<typeof vi.fn>;
  let mockGetTeamUsage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnReorderTeam = vi.fn();
    mockGetTeamUsage = vi.fn(() => []);
  });

  const renderCard = (totalGroups = 2, index = 0) => {
    return render(
      <TeamGroupCard
        group={mockGroup}
        teams={mockTeams}
        allGroups={[mockGroup, { id: 'group-2', name: 'Group B', order: 1 }]}
        onUpdateGroup={vi.fn()}
        onDeleteGroup={vi.fn()}
        onReorderGroup={vi.fn()}
        onUpdateTeam={vi.fn()}
        onDeleteTeam={vi.fn()}
        onReorderTeam={mockOnReorderTeam}
        onAddTeam={vi.fn()}
        getTeamUsage={mockGetTeamUsage}
        index={index}
        totalGroups={totalGroups}
      />
    );
  };

  it('TDD RED: team reorder buttons should NOT toggle group expansion', async () => {
    renderCard(true);

    // Initial state: Teams are visible
    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('Team 2')).toBeInTheDocument();

    // Find the down reorder button for Team 1
    const downButtons = screen.getAllByTitle(/move this team one position down/i);
    
    // Click the button for first team
    fireEvent.click(downButtons[0]);

    // Verify reorder logic was called
    expect(mockOnReorderTeam).toHaveBeenCalledWith('team-1', 'down');

    // Verify teams are STILL visible (expansion state should not have changed)
    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('Team 2')).toBeInTheDocument();
  });

  it('TDD RED: group reorder buttons should NOT toggle group expansion', async () => {
    renderCard(true, 2, 0);

    // Initial state: Expanded
    expect(screen.getByText('Team 1')).toBeInTheDocument();

    // Find group down button
    const downButton = screen.getByTitle(/move this team group one position down/i);
    
    // Click it
    fireEvent.click(downButton);

    // Verify teams are STILL visible
    expect(screen.getByText('Team 1')).toBeInTheDocument();
  });

  it('TDD RED: group add team button should NOT toggle group expansion', async () => {
    renderCard(true);
    const addButton = screen.getByTitle(/add a new team to this group/i);
    fireEvent.click(addButton);
    expect(screen.getByText('Team 1')).toBeInTheDocument();
  });

  it('TDD RED: group delete button should NOT toggle group expansion', async () => {
    renderCard(true);
    const deleteButton = screen.getByTitle(/permanently remove this team group/i);
    fireEvent.click(deleteButton);
    expect(screen.getByText('Team 1')).toBeInTheDocument();
  });
});
