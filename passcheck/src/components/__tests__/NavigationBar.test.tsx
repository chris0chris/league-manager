import React from 'react';
import { render, screen } from '@testing-library/react';
import NavigationBar from '../NavigationBar';

describe('NavigationBar', () => {
  it('renders the navigation bar with correct content', () => {
    render(<NavigationBar />);
    
    expect(screen.getByText('Passcheck')).toBeInTheDocument();
    expect(screen.getByText('Scorecard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scorecard' })).toHaveAttribute('href', '/scorecard');
  });

  it('has fixed bottom positioning', () => {
    render(<NavigationBar />);
    
    const navbar = screen.getByRole('navigation');
    expect(navbar).toHaveClass('fixed-bottom');
  });

  it('has correct Bootstrap classes', () => {
    render(<NavigationBar />);
    
    const navbar = screen.getByRole('navigation');
    expect(navbar).toHaveClass('bg-body-tertiary');
    expect(navbar).toHaveClass('navbar');
  });

  it('has a toggle button for mobile view', () => {
    render(<NavigationBar />);
    
    expect(screen.getByLabelText('Toggle navigation')).toBeInTheDocument();
  });
});