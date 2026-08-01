/**
 * Tests for components/GameCreationStats.tsx
 *
 * Coverage targets:
 * - Default tab (30 days) is active on render
 * - All time window tabs are displayed
 * - Clicking tabs switches displayed data and fires callback
 * - Active tab has aria-selected="true"
 * - League breakdown expands/collapses
 * - Percentages display correctly
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GameCreationStats } from '../GameCreationStats';
import { GameCreationStatsResponse } from '../../types';

const mockData: GameCreationStatsResponse = {
  summary: {
    '7': { designer: 2, legacy: 18, total: 20, designer_percentage: 10.0 },
    '30': { designer: 12, legacy: 120, total: 132, designer_percentage: 9.1 },
    '90': { designer: 45, legacy: 380, total: 425, designer_percentage: 10.6 },
  },
  by_league: {
    '7': [{ league_name: 'FF BL', league_id: 1, designer: 2, legacy: 0, total: 2, designer_percentage: 100.0 }],
    '30': [
      { league_name: 'FF BL', league_id: 1, designer: 8, legacy: 0, total: 8, designer_percentage: 100.0 },
      { league_name: 'Bayern U16', league_id: 2, designer: 0, legacy: 20, total: 20, designer_percentage: 0.0 },
      { league_name: 'OL NRW', league_id: 3, designer: 2, legacy: 18, total: 20, designer_percentage: 10.0 },
    ],
    '90': [
      { league_name: 'FF BL', league_id: 1, designer: 15, legacy: 10, total: 25, designer_percentage: 60.0 },
      { league_name: 'Bayern U16', league_id: 2, designer: 10, legacy: 50, total: 60, designer_percentage: 16.7 },
      { league_name: 'OL NRW', league_id: 3, designer: 20, legacy: 320, total: 340, designer_percentage: 5.9 },
    ],
  },
};

describe('GameCreationStats', () => {
  it('test_renders_the_component_with_default_30_day_tab_active', () => {
    const { container } = render(React.createElement(GameCreationStats, { data: mockData }));

    // Check that component renders
    expect(container.querySelector('.games-created-card')).toBeTruthy();

    // Check that 30-day tab is active (default)
    const tabs = container.querySelectorAll('.time-window-tabs .tab');
    expect(tabs[1]).toHaveClass('active');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');

    // Check that 30-day data is displayed
    const text = container.textContent || '';
    expect(text).toContain('12 games'); // Designer count for 30 days
    expect(text).toContain('120 games'); // Legacy count for 30 days
  });

  it('test_displays_time_window_tabs', () => {
    const { container } = render(React.createElement(GameCreationStats, { data: mockData }));

    const tabs = container.querySelectorAll('.time-window-tabs .tab');
    expect(tabs.length).toBe(3);

    const text = container.textContent || '';
    expect(text).toContain('Last 7 Days');
    expect(text).toContain('Last 30 Days');
    expect(text).toContain('Last 90 Days');
  });

  it('test_switches_data_when_tab_is_clicked', () => {
    const { container } = render(React.createElement(GameCreationStats, { data: mockData }));

    const tabs = container.querySelectorAll('.time-window-tabs .tab');

    // Initially showing 30-day data
    let text = container.textContent || '';
    expect(text).toContain('12 games'); // 30-day designer

    // Click 7-day tab
    fireEvent.click(tabs[0]);

    text = container.textContent || '';
    expect(text).toContain('2 games'); // 7-day designer

    // Click 90-day tab
    fireEvent.click(tabs[2]);

    text = container.textContent || '';
    expect(text).toContain('45 games'); // 90-day designer
  });

  it('test_marks_active_tab_with_aria_selected', () => {
    const { container } = render(React.createElement(GameCreationStats, { data: mockData }));

    const tabs = container.querySelectorAll('.time-window-tabs .tab');

    // 30-day tab should be selected by default
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');

    // Click 7-day tab
    fireEvent.click(tabs[0]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');

    // Click 90-day tab
    fireEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('test_calls_onTabChange_callback_when_tab_clicked', () => {
    const onTabChange = vi.fn();
    const { container } = render(React.createElement(GameCreationStats, { data: mockData, onTabChange }));

    const tabs = container.querySelectorAll('.time-window-tabs .tab');

    fireEvent.click(tabs[0]);
    expect(onTabChange).toHaveBeenCalledWith('7');

    fireEvent.click(tabs[2]);
    expect(onTabChange).toHaveBeenCalledWith('90');

    // Callback should have been called exactly twice
    expect(onTabChange).toHaveBeenCalledTimes(2);
  });

  it('test_expands_and_collapses_league_breakdown', () => {
    const { container } = render(React.createElement(GameCreationStats, { data: mockData }));

    // Initially, breakdown should not be visible
    let breakdownContainer = container.querySelector('.league-breakdown-container');
    expect(breakdownContainer).toBeFalsy();

    // Get the expand button
    const expandButton = container.querySelector('.expand-button');
    expect(expandButton).toBeTruthy();
    expect(expandButton?.textContent).toContain('View');

    // Click to expand
    fireEvent.click(expandButton as HTMLButtonElement);

    // Breakdown should now be visible
    breakdownContainer = container.querySelector('.league-breakdown-container');
    expect(breakdownContainer).toBeTruthy();
    expect(expandButton?.textContent).toContain('Hide');

    // Click to collapse
    fireEvent.click(expandButton as HTMLButtonElement);

    // Breakdown should be hidden again
    breakdownContainer = container.querySelector('.league-breakdown-container');
    expect(breakdownContainer).toBeFalsy();
    expect(expandButton?.textContent).toContain('View');
  });

  it('test_displays_percentage_correctly', () => {
    const { container } = render(React.createElement(GameCreationStats, { data: mockData }));

    const text = container.textContent || '';

    // 30-day tab is active by default, showing 9.1%
    expect(text).toContain('9.1%');
    expect(text).toContain('90.9%'); // Inverse percentage for legacy

    const tabs = container.querySelectorAll('.time-window-tabs .tab');

    // Switch to 7-day tab
    fireEvent.click(tabs[0]);
    let updatedText = container.textContent || '';
    expect(updatedText).toContain('10%'); // 7-day percentage

    // Switch to 90-day tab
    fireEvent.click(tabs[2]);
    updatedText = container.textContent || '';
    expect(updatedText).toContain('10.6%'); // 90-day percentage
  });
});
