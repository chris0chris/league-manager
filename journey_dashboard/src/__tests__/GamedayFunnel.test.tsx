/**
 * Tests for components/GamedayFunnel.tsx
 *
 * Coverage targets:
 * - calculateFunnel function with various event combinations
 * - Percentage calculations (relative to previous stage)
 * - Template adoption metrics
 * - Edge cases (empty events, missing stages)
 */

import { describe, it, expect } from 'vitest';
import { calculateFunnel, GamedayFunnel } from '../components/GamedayFunnel';
import { JourneyEvent } from '../types';
import React from 'react';
import { render } from '@testing-library/react';

describe('calculateFunnel', () => {
  describe('Basic Funnel Calculation', () => {
    it('should calculate funnel with all stages present', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-06' },
        { id: 7, event_name: 'template_used', metadata: {}, created_at: '2024-01-07' },
      ];

      const result = calculateFunnel(events);

      expect(result.opened.count).toBe(2);
      expect(result.opened.percentage).toBe(100);
      expect(result.created.count).toBe(2);
      expect(result.edited.count).toBe(1);
      expect(result.published.count).toBe(1);
      expect(result.templateUsed.count).toBe(1);
    });

    it('should set opened stage to 100% as baseline', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
      ];

      const result = calculateFunnel(events);

      expect(result.opened.percentage).toBe(100);
    });

    it('should set opened count to 1 if no opened events exist', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
      ];

      const result = calculateFunnel(events);

      expect(result.opened.count).toBe(1);
      expect(result.opened.percentage).toBe(100);
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate correct percentages for each stage relative to previous', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-06' },
        { id: 7, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-07' },
      ];

      const result = calculateFunnel(events);

      // 4 opened (100%)
      expect(result.opened.percentage).toBe(100);
      // 2 created / 4 opened = 50%
      expect(result.created.percentage).toBe(50);
      // 1 edited / 2 created = 50%
      expect(result.edited.percentage).toBe(50);
      // 0 published / 1 edited = 0%
      expect(result.published.percentage).toBe(0);
    });

    it('should calculate template usage percentage correctly', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'template_used', metadata: {}, created_at: '2024-01-06' },
      ];

      const result = calculateFunnel(events);

      // 2 published (from 1 edited = 200% - but this is counted correctly)
      expect(result.published.count).toBe(2);
      // 1 template used / 2 published = 50%
      expect(result.templateUsed.percentage).toBe(50);
    });

    it('should return 0% when previous stage has 0 count', () => {
      const events: JourneyEvent[] = [];

      const result = calculateFunnel(events);

      expect(result.created.percentage).toBe(0);
      expect(result.edited.percentage).toBe(0);
      expect(result.published.percentage).toBe(0);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should handle empty events array', () => {
      const events: JourneyEvent[] = [];

      const result = calculateFunnel(events);

      expect(result.opened.count).toBe(1);
      expect(result.opened.percentage).toBe(100);
      expect(result.created.count).toBe(0);
      expect(result.edited.count).toBe(0);
      expect(result.published.count).toBe(0);
      expect(result.templateUsed.count).toBe(0);
    });

    it('should handle single stage (only opened)', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
      ];

      const result = calculateFunnel(events);

      expect(result.opened.count).toBe(1);
      expect(result.created.count).toBe(0);
      expect(result.created.percentage).toBe(0);
    });

    it('should handle partial funnel (only created, no edited)', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
      ];

      const result = calculateFunnel(events);

      expect(result.opened.count).toBe(1);
      expect(result.created.count).toBe(1);
      expect(result.created.percentage).toBe(100);
      expect(result.edited.count).toBe(0);
      expect(result.edited.percentage).toBe(0);
    });
  });

  describe('Template Adoption', () => {
    it('should track template usage correctly', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'template_used', metadata: {}, created_at: '2024-01-05' },
      ];

      const result = calculateFunnel(events);

      expect(result.templateUsed.count).toBe(1);
      expect(result.templateUsed.percentage).toBe(100);
    });

    it('should calculate template adoption as percentage of published', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-06' },
        { id: 7, event_name: 'template_used', metadata: {}, created_at: '2024-01-07' },
        { id: 8, event_name: 'template_used', metadata: {}, created_at: '2024-01-08' },
      ];

      const result = calculateFunnel(events);

      // 3 published, 2 template used = 66.67%
      expect(result.templateUsed.count).toBe(2);
      expect(result.templateUsed.percentage).toBeCloseTo(66.67, 1);
    });

    it('should handle zero template adoption', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-04' },
      ];

      const result = calculateFunnel(events);

      expect(result.templateUsed.count).toBe(0);
      expect(result.templateUsed.percentage).toBe(0);
    });
  });

  describe('Event Filtering', () => {
    it('should only count relevant event names', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'random_event', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'other_event', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-06' },
      ];

      const result = calculateFunnel(events);

      expect(result.opened.count).toBe(1);
      expect(result.created.count).toBe(1);
      expect(result.edited.count).toBe(1);
      expect(result.published.count).toBe(1);
    });

    it('should handle multiple events of same type', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-06' },
        { id: 7, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-07' },
        { id: 8, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-08' },
      ];

      const result = calculateFunnel(events);

      expect(result.opened.count).toBe(2);
      expect(result.created.count).toBe(3);
      expect(result.edited.count).toBe(2);
      expect(result.published.count).toBe(1);
    });
  });
});

describe('GamedayFunnel Component', () => {
  it('should render funnel component with events', () => {
    const events: JourneyEvent[] = [
      { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
      { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
      { id: 3, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-03' },
      { id: 4, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-04' },
    ];

    const { container } = render(React.createElement(GamedayFunnel, { events }));

    expect(container.querySelector('.gameday-funnel')).toBeTruthy();
    expect(container.querySelector('.funnel-title')).toBeTruthy();
  });

  it('should render all funnel stages', () => {
    const events: JourneyEvent[] = [
      { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
      { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
      { id: 3, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-03' },
      { id: 4, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-04' },
      { id: 5, event_name: 'template_used', metadata: {}, created_at: '2024-01-05' },
    ];

    const { container } = render(React.createElement(GamedayFunnel, { events }));

    const stages = container.querySelectorAll('.funnel-stage');
    expect(stages.length).toBe(5); // opened, created, edited, published, templateUsed
  });

  it('should display stage names and metrics', () => {
    const events: JourneyEvent[] = [
      { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
      { id: 2, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
    ];

    const { container } = render(React.createElement(GamedayFunnel, { events }));

    const text = container.textContent || '';
    expect(text).toContain('Opened');
    expect(text).toContain('Created');
    expect(text).toContain('Published');
  });

  it('should render with empty events array', () => {
    const events: JourneyEvent[] = [];

    const { container } = render(React.createElement(GamedayFunnel, { events }));

    expect(container.querySelector('.gameday-funnel')).toBeTruthy();
    expect(container.querySelector('.funnel-container')).toBeTruthy();
  });
});
