import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ProgressBar from '../ProgressBar';
import styles from '../styles.module.css';

describe('ProgressBar', () => {
  it('should use gray color for played games when not finished', () => {
    const { container } = render(<ProgressBar total={10} played={5} live={2} />);
    const playedSegment = container.querySelector(`.${styles.progressSegment}`);
    expect(playedSegment).toHaveStyle({ backgroundColor: '#6c757d' });
  });

  it('should use green color for played games when finished', () => {
    const { container } = render(<ProgressBar total={10} played={10} live={0} />);
    const playedSegment = container.querySelector(`.${styles.progressSegment}`);
    expect(playedSegment).toHaveStyle({ backgroundColor: '#28a745' });
  });

  it('should not render played segment if played is 0', () => {
    const { container } = render(<ProgressBar total={10} played={0} live={2} />);
    // The first segment will be live (green)
    const playedSegment = container.querySelector(`[style*="background-color: rgb(108, 117, 125)"]`); // #6c757d
    expect(playedSegment).toBeNull();
  });
});
