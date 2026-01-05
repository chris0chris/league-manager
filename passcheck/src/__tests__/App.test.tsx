import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders the App component with NavigationBar', () => {
    render(<App />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders with MessageProvider', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.container')).toBeInTheDocument();
  });

  it('renders Message component', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.mt-2')).toBeInTheDocument();
  });
});
