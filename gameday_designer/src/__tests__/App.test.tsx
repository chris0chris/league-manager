/**
 * Tests for App Component Routing
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import { GamedayProvider } from '../context/GamedayContext';

// Mock child components
vi.mock('../components/dashboard/GamedayDashboard', () => ({
  default: () => <div data-testid="dashboard">Gameday Dashboard</div>,
}));

vi.mock('../components/ListDesignerApp', () => ({
  default: () => <div data-testid="editor">List Designer App</div>,
}));

describe('App Routing', () => {
  it('renders Dashboard at root route', () => {
    window.history.pushState({}, 'Test page', '/');
    render(<GamedayProvider><App /></GamedayProvider>);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders Editor at /designer/:id route', () => {
    window.history.pushState({}, 'Test page', '/designer/123');
    render(<GamedayProvider><App /></GamedayProvider>);
    expect(screen.getByTestId('editor')).toBeInTheDocument();
  });
});
