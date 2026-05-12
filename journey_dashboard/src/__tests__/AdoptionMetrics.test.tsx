/**
 * Tests for components/AdoptionMetrics.tsx
 *
 * Coverage targets:
 * - calculateMetrics function with various event combinations
 * - Designer opens count
 * - Publish rate calculations
 * - Template adoption rate calculations
 * - Edge cases (empty events, zero opens, etc)
 */

import { describe, it, expect } from 'vitest';
import { calculateMetrics, AdoptionMetrics } from '../components/AdoptionMetrics';
import { JourneyEvent } from '../types';
import React from 'react';
import { render } from '@testing-library/react';

describe('calculateMetrics', () => {
  describe('Designer Opens Calculation', () => {
    it('should count unique gameday_opened events', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
      ];

      const result = calculateMetrics(events);

      expect(result.designerOpens).toBe(3);
    });

    it('should return 0 when no opens exist', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-02' },
      ];

      const result = calculateMetrics(events);

      expect(result.designerOpens).toBe(0);
    });

    it('should handle empty events array', () => {
      const events: JourneyEvent[] = [];

      const result = calculateMetrics(events);

      expect(result.designerOpens).toBe(0);
    });
  });

  describe('Publish Rate Calculation', () => {
    it('should calculate publish rate as percentage of opens', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-06' },
      ];

      const result = calculateMetrics(events);

      // 2 published / 4 opens = 50%
      expect(result.publishRate).toBe(50);
    });

    it('should calculate 100% publish rate when all opens publish', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-04' },
      ];

      const result = calculateMetrics(events);

      expect(result.publishRate).toBe(100);
    });

    it('should return 0% when no publishes occur', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
      ];

      const result = calculateMetrics(events);

      expect(result.publishRate).toBe(0);
    });

    it('should return 0% when there are no opens', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-01' },
      ];

      const result = calculateMetrics(events);

      expect(result.publishRate).toBe(0);
    });

    it('should handle fractional publish rates', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-04' },
      ];

      const result = calculateMetrics(events);

      // 1 published / 3 opens = 33.33%
      expect(result.publishRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('Template Adoption Rate Calculation', () => {
    it('should calculate template adoption as percentage of opens', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'template_used', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'template_used', metadata: {}, created_at: '2024-01-06' },
      ];

      const result = calculateMetrics(events);

      // 2 template used / 4 opens = 50%
      expect(result.templateAdoptionRate).toBe(50);
    });

    it('should calculate 100% adoption when all opens use templates', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'template_used', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'template_used', metadata: {}, created_at: '2024-01-04' },
      ];

      const result = calculateMetrics(events);

      expect(result.templateAdoptionRate).toBe(100);
    });

    it('should return 0% when no templates are used', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
      ];

      const result = calculateMetrics(events);

      expect(result.templateAdoptionRate).toBe(0);
    });

    it('should return 0% when there are no opens', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'template_used', metadata: {}, created_at: '2024-01-01' },
      ];

      const result = calculateMetrics(events);

      expect(result.templateAdoptionRate).toBe(0);
    });

    it('should handle fractional adoption rates', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'template_used', metadata: {}, created_at: '2024-01-04' },
      ];

      const result = calculateMetrics(events);

      // 1 template / 3 opens = 33.33%
      expect(result.templateAdoptionRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty events array', () => {
      const events: JourneyEvent[] = [];

      const result = calculateMetrics(events);

      expect(result.designerOpens).toBe(0);
      expect(result.publishRate).toBe(0);
      expect(result.templateAdoptionRate).toBe(0);
    });

    it('should handle mixed event types', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'random_event', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'template_used', metadata: {}, created_at: '2024-01-06' },
      ];

      const result = calculateMetrics(events);

      expect(result.designerOpens).toBe(1);
      expect(result.publishRate).toBe(100);
      expect(result.templateAdoptionRate).toBe(100);
    });

    it('should handle more publishes than opens (e.g., multiple publishes per session)', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-03' },
      ];

      const result = calculateMetrics(events);

      // 2 published / 1 open = 200%
      expect(result.publishRate).toBe(200);
    });

    it('should handle only gameday_opened events', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
      ];

      const result = calculateMetrics(events);

      expect(result.designerOpens).toBe(2);
      expect(result.publishRate).toBe(0);
      expect(result.templateAdoptionRate).toBe(0);
    });
  });

  describe('Combined Scenarios', () => {
    it('should calculate all metrics correctly in realistic scenario', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-06' },
        { id: 7, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-07' },
        { id: 8, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-08' },
        { id: 9, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-09' },
        { id: 10, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-10' },
        { id: 11, event_name: 'template_used', metadata: {}, created_at: '2024-01-11' },
        { id: 12, event_name: 'template_used', metadata: {}, created_at: '2024-01-12' },
      ];

      const result = calculateMetrics(events);

      // 5 opens
      expect(result.designerOpens).toBe(5);
      // 3 published / 5 opens = 60%
      expect(result.publishRate).toBe(60);
      // 2 templates / 5 opens = 40%
      expect(result.templateAdoptionRate).toBe(40);
    });
  });
});

describe('AdoptionMetrics Component', () => {
  it('should render adoption metrics component', () => {
    const events: JourneyEvent[] = [
      { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
      { id: 2, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-02' },
    ];

    const { container } = render(React.createElement(AdoptionMetrics, { events }));

    expect(container.querySelector('.adoption-metrics')).toBeTruthy();
    expect(container.querySelector('.metrics-title')).toBeTruthy();
  });

  it('should render all three metric cards', () => {
    const events: JourneyEvent[] = [
      { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
      { id: 2, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-02' },
      { id: 3, event_name: 'template_used', metadata: {}, created_at: '2024-01-03' },
    ];

    const { container } = render(React.createElement(AdoptionMetrics, { events }));

    const cards = container.querySelectorAll('.metric-card');
    expect(cards.length).toBe(3);
  });

  it('should display metric cards with values and labels', () => {
    const events: JourneyEvent[] = [
      { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
      { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
      { id: 3, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-03' },
      { id: 4, event_name: 'template_used', metadata: {}, created_at: '2024-01-04' },
    ];

    const { container } = render(React.createElement(AdoptionMetrics, { events }));

    const text = container.textContent || '';
    expect(text).toContain('Designer Opens');
    expect(text).toContain('Publish Rate');
    expect(text).toContain('Template Adoption');
    expect(text).toContain('2'); // 2 opens
    expect(text).toContain('50%'); // 50% publish rate
  });

  it('should render with empty events array', () => {
    const events: JourneyEvent[] = [];

    const { container } = render(React.createElement(AdoptionMetrics, { events }));

    expect(container.querySelector('.adoption-metrics')).toBeTruthy();
    expect(container.querySelector('.metrics-grid')).toBeTruthy();
  });

  it('should display metric descriptions', () => {
    const events: JourneyEvent[] = [];

    const { container } = render(React.createElement(AdoptionMetrics, { events }));

    const text = container.textContent || '';
    expect(text).toContain('opened');
    expect(text).toContain('published gamedays');
    expect(text).toContain('used templates');
  });
});
