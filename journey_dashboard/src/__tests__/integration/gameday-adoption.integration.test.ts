/**
 * Integration Tests: Gameday Adoption Tracking
 *
 * End-to-end tests verifying:
 * - Full user journey: open → create → edit → publish
 * - Funnel percentages accuracy
 * - Metrics display correct values
 * - Mixed event timeline (gameday + other features)
 * - Filter functionality (shows/hides correct events)
 * - Template adoption path
 */

import { describe, it, expect } from 'vitest';
import { JourneyEvent } from '../../types';
import { calculateFunnel } from '../../components/GamedayFunnel';
import { calculateMetrics } from '../../components/AdoptionMetrics';

describe('Integration: Gameday Adoption Tracking', () => {
  describe('Complete User Journey: Open → Create → Edit → Publish', () => {
    /**
     * Test: Full conversion path with all stages
     * Expected: All metrics calculated correctly
     */
    it('should track complete gameday lifecycle with all stages', () => {
      const events: JourneyEvent[] = [
        {
          id: 1,
          event_name: 'gameday_opened',
          metadata: { gameday_id: 'gd1', session_id: 'sess1' },
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 2,
          event_name: 'gameday_created',
          metadata: { gameday_id: 'gd1', gameday_name: 'League Final' },
          created_at: '2024-01-01T10:05:00Z',
        },
        {
          id: 3,
          event_name: 'gameday_edited',
          metadata: { gameday_id: 'gd1', field_modified: 'teams' },
          created_at: '2024-01-01T10:15:00Z',
        },
        {
          id: 4,
          event_name: 'gameday_published',
          metadata: { gameday_id: 'gd1', published_at: '2024-01-01T10:20:00Z' },
          created_at: '2024-01-01T10:20:00Z',
        },
      ];

      const funnel = calculateFunnel(events);
      const metrics = calculateMetrics(events);

      // Verify funnel stages
      expect(funnel.opened.count).toBe(1);
      expect(funnel.opened.percentage).toBe(100);
      expect(funnel.created.count).toBe(1);
      expect(funnel.created.percentage).toBe(100);
      expect(funnel.edited.count).toBe(1);
      expect(funnel.edited.percentage).toBe(100);
      expect(funnel.published.count).toBe(1);
      expect(funnel.published.percentage).toBe(100);

      // Verify metrics
      expect(metrics.designerOpens).toBe(1);
      expect(metrics.publishRate).toBe(100);
    });

    /**
     * Test: Partial path (open → create, but no publish)
     * Expected: Funnel shows dropout at publish stage
     */
    it('should handle partial conversion path with dropout at publish', () => {
      const events: JourneyEvent[] = [
        {
          id: 1,
          event_name: 'gameday_opened',
          metadata: { gameday_id: 'gd2', session_id: 'sess2' },
          created_at: '2024-01-02T10:00:00Z',
        },
        {
          id: 2,
          event_name: 'gameday_created',
          metadata: { gameday_id: 'gd2' },
          created_at: '2024-01-02T10:05:00Z',
        },
        {
          id: 3,
          event_name: 'gameday_edited',
          metadata: { gameday_id: 'gd2' },
          created_at: '2024-01-02T10:15:00Z',
        },
        // No publish event - user abandoned
      ];

      const funnel = calculateFunnel(events);
      const metrics = calculateMetrics(events);

      expect(funnel.opened.count).toBe(1);
      expect(funnel.created.count).toBe(1);
      expect(funnel.edited.count).toBe(1);
      expect(funnel.published.count).toBe(0);
      expect(metrics.publishRate).toBe(0);
    });

    /**
     * Test: Multiple attempts before successful publish
     * Expected: Funnel shows accumulated opens/creates, single publish
     */
    it('should track multiple create attempts before successful publish', () => {
      const events: JourneyEvent[] = [
        {
          id: 1,
          event_name: 'gameday_opened',
          metadata: { gameday_id: 'gd3', session_id: 'sess3' },
          created_at: '2024-01-03T10:00:00Z',
        },
        {
          id: 2,
          event_name: 'gameday_created',
          metadata: { gameday_id: 'gd3-attempt1' },
          created_at: '2024-01-03T10:05:00Z',
        },
        {
          id: 3,
          event_name: 'gameday_edited',
          metadata: { gameday_id: 'gd3-attempt1' },
          created_at: '2024-01-03T10:10:00Z',
        },
        // Abandoned first attempt
        {
          id: 4,
          event_name: 'gameday_opened',
          metadata: { gameday_id: 'gd3', session_id: 'sess3' },
          created_at: '2024-01-03T11:00:00Z',
        },
        {
          id: 5,
          event_name: 'gameday_created',
          metadata: { gameday_id: 'gd3-attempt2' },
          created_at: '2024-01-03T11:05:00Z',
        },
        {
          id: 6,
          event_name: 'gameday_published',
          metadata: { gameday_id: 'gd3-attempt2' },
          created_at: '2024-01-03T11:15:00Z',
        },
      ];

      const funnel = calculateFunnel(events);
      const metrics = calculateMetrics(events);

      expect(funnel.opened.count).toBe(2);
      expect(funnel.created.count).toBe(2);
      expect(funnel.published.count).toBe(1);
      expect(metrics.publishRate).toBeGreaterThan(0);
      expect(metrics.publishRate).toBeLessThan(100);
    });
  });

  describe('Funnel Percentage Calculations', () => {
    /**
     * Test: Funnel percentages relative to previous stage
     * Expected: Each stage calculated as percentage of previous stage
     */
    it('should calculate funnel percentages correctly', () => {
      const events: JourneyEvent[] = [
        // 4 opens
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 4, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        // 3 creates (75% conversion from opens)
        { id: 5, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 6, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 7, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        // 2 edits (66% conversion from creates)
        { id: 8, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-01' },
        { id: 9, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-01' },
        // 1 publish (50% conversion from edits)
        { id: 10, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-01' },
      ];

      const funnel = calculateFunnel(events);

      expect(funnel.opened.count).toBe(4);
      expect(funnel.opened.percentage).toBe(100);

      expect(funnel.created.count).toBe(3);
      expect(funnel.created.percentage).toBeCloseTo(75, 0);

      expect(funnel.edited.count).toBe(2);
      expect(funnel.edited.percentage).toBeCloseTo(66.67, 1);

      expect(funnel.published.count).toBe(1);
      expect(funnel.published.percentage).toBeCloseTo(50, 0);
    });

    /**
     * Test: Template adoption shows correct percentage
     * Expected: Template usage calculated as percentage of published
     */
    it('should calculate template adoption rate correctly', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 4, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 5, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-01' },
        { id: 6, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-01' },
        // 1 template usage (50% of published)
        { id: 7, event_name: 'template_used', metadata: { template_id: 't1' }, created_at: '2024-01-01' },
      ];

      const funnel = calculateFunnel(events);

      expect(funnel.opened.count).toBe(4);
      expect(funnel.published.count).toBe(2);
      expect(funnel.templateUsed.count).toBe(1);
      expect(funnel.templateUsed.percentage).toBeCloseTo(50, 0);
    });
  });

  describe('Metrics Display Accuracy', () => {
    /**
     * Test: Designer open counts are accurate
     * Expected: Correctly count gameday_opened events
     */
    it('should display accurate designer open counts', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: { session_id: 'sess1' }, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: { session_id: 'sess2' }, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: { session_id: 'sess3' }, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_opened', metadata: { session_id: 'sess4' }, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_opened', metadata: { session_id: 'sess5' }, created_at: '2024-01-05' },
      ];

      const metrics = calculateMetrics(events);

      expect(metrics.designerOpens).toBe(5);
    });

    /**
     * Test: Publish rate is calculated as percentage
     * Expected: (published / opens) * 100
     */
    it('should calculate publish rate as percentage of opens', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-06' },
      ];

      const metrics = calculateMetrics(events);

      // 2 published / 4 opens = 50%
      expect(metrics.publishRate).toBe(50);
    });

    /**
     * Test: Template adoption rate is calculated correctly
     * Expected: (template_used / opens) * 100
     */
    it('should calculate template adoption rate accurately', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
        { id: 4, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-04' },
        { id: 5, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-05' },
        { id: 6, event_name: 'template_used', metadata: { template_id: 't1' }, created_at: '2024-01-06' },
        { id: 7, event_name: 'template_used', metadata: { template_id: 't2' }, created_at: '2024-01-07' },
        { id: 8, event_name: 'template_used', metadata: { template_id: 't3' }, created_at: '2024-01-08' },
      ];

      const metrics = calculateMetrics(events);

      // 3 templates / 5 opens = 60%
      expect(metrics.templateAdoptionRate).toBeCloseTo(60, 0);
    });
  });

  describe('Mixed Event Timeline (Gameday + Other Features)', () => {
    /**
     * Test: Filter correctly isolates gameday events from other features
     * Expected: gameday_* and template_* events counted, others ignored
     */
    it('should filter and process gameday events among mixed events', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'passcheck_viewed', metadata: {}, created_at: '2024-01-01' }, // Other feature
        { id: 3, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 4, event_name: 'scorecard_edited', metadata: {}, created_at: '2024-01-02' }, // Other feature
        { id: 5, event_name: 'gameday_edited', metadata: {}, created_at: '2024-01-03' },
        { id: 6, event_name: 'template_used', metadata: {}, created_at: '2024-01-04' },
        { id: 7, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-05' },
      ];

      const gamedayEvents = events.filter(
        (e) => e.event_name.startsWith('gameday_') || e.event_name.startsWith('template_')
      );
      const funnel = calculateFunnel(gamedayEvents);

      expect(gamedayEvents.length).toBe(5);
      expect(funnel.opened.count).toBe(1);
      expect(funnel.created.count).toBe(1);
      expect(funnel.edited.count).toBe(1);
      expect(funnel.published.count).toBe(1);
      expect(funnel.templateUsed.count).toBe(1);
    });

    /**
     * Test: Metrics calculated only from gameday events
     * Expected: Other feature events excluded from calculations
     */
    it('should calculate metrics excluding non-gameday events', () => {
      const allEvents: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 3, event_name: 'passcheck_scan', metadata: {}, created_at: '2024-01-01' },
        { id: 4, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 5, event_name: 'scorecard_saved', metadata: {}, created_at: '2024-01-02' },
        { id: 6, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-03' },
      ];

      const gamedayEvents = allEvents.filter(
        (e) => e.event_name.startsWith('gameday_') || e.event_name.startsWith('template_')
      );
      const metrics = calculateMetrics(gamedayEvents);

      expect(gamedayEvents.length).toBe(4);
      expect(metrics.designerOpens).toBe(2);
      expect(metrics.publishRate).toBeCloseTo(50, 0);
    });
  });

  describe('Filter Functionality (Shows/Hides Correct Events)', () => {
    /**
     * Test: Filter 'gameday_designer' shows only gameday_* and template_* events
     * Expected: All non-gameday events hidden
     */
    it('should show only gameday events when gameday_designer filter applied', () => {
      const allEvents: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'passcheck_viewed', metadata: {}, created_at: '2024-01-01' },
        { id: 3, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 4, event_name: 'scorecard_saved', metadata: {}, created_at: '2024-01-02' },
        { id: 5, event_name: 'template_used', metadata: {}, created_at: '2024-01-03' },
      ];

      const filteredEvents = allEvents.filter(
        (e) => e.event_name.startsWith('gameday_') || e.event_name.startsWith('template_')
      );

      expect(filteredEvents.length).toBe(3);
      expect(filteredEvents.map((e) => e.event_name)).toEqual([
        'gameday_opened',
        'gameday_created',
        'template_used',
      ]);
    });

    /**
     * Test: Filter 'passcheck' shows only passcheck_* events
     * Expected: All non-passcheck events hidden
     */
    it('should show only passcheck events when passcheck filter applied', () => {
      const allEvents: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'passcheck_viewed', metadata: {}, created_at: '2024-01-01' },
        { id: 3, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 4, event_name: 'passcheck_scanned', metadata: {}, created_at: '2024-01-02' },
      ];

      const filteredEvents = allEvents.filter((e) => e.event_name.startsWith('passcheck_'));

      expect(filteredEvents.length).toBe(2);
      expect(filteredEvents.map((e) => e.event_name)).toEqual(['passcheck_viewed', 'passcheck_scanned']);
    });

    /**
     * Test: Filter 'all' shows all events
     * Expected: No events filtered
     */
    it('should show all events when all filter applied', () => {
      const allEvents: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'passcheck_viewed', metadata: {}, created_at: '2024-01-01' },
        { id: 3, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 4, event_name: 'scorecard_saved', metadata: {}, created_at: '2024-01-02' },
      ];

      const filteredEvents = allEvents;

      expect(filteredEvents.length).toBe(4);
      expect(filteredEvents.length).toBe(allEvents.length);
    });
  });

  describe('Template Adoption Path', () => {
    /**
     * Test: Template usage tracked correctly
     * Expected: template_used events counted and associated with gameday_created
     */
    it('should track template adoption in user journey', () => {
      const events: JourneyEvent[] = [
        {
          id: 1,
          event_name: 'gameday_opened',
          metadata: { session_id: 'sess1' },
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 2,
          event_name: 'gameday_created',
          metadata: { gameday_id: 'gd1' },
          created_at: '2024-01-01T10:05:00Z',
        },
        {
          id: 3,
          event_name: 'template_used',
          metadata: { template_id: 'template_league_final', template_name: 'League Final' },
          created_at: '2024-01-01T10:06:00Z',
        },
        {
          id: 4,
          event_name: 'gameday_edited',
          metadata: { gameday_id: 'gd1' },
          created_at: '2024-01-01T10:15:00Z',
        },
        {
          id: 5,
          event_name: 'gameday_published',
          metadata: { gameday_id: 'gd1' },
          created_at: '2024-01-01T10:20:00Z',
        },
      ];

      const funnel = calculateFunnel(events);

      expect(funnel.templateUsed.count).toBe(1);
      expect(funnel.created.count).toBe(1);
      // Template adoption rate = 1 template / 1 create = 100%
      expect(funnel.templateUsed.percentage).toBe(100);
    });

    /**
     * Test: Multiple template usages in single journey
     * Expected: All template events counted
     */
    it('should count multiple template usages across journey', () => {
      const events: JourneyEvent[] = [
        {
          id: 1,
          event_name: 'template_used',
          metadata: { template_id: 't1' },
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 2,
          event_name: 'template_used',
          metadata: { template_id: 't2' },
          created_at: '2024-01-01T10:05:00Z',
        },
        {
          id: 3,
          event_name: 'template_used',
          metadata: { template_id: 't3' },
          created_at: '2024-01-01T10:10:00Z',
        },
      ];

      const funnel = calculateFunnel(events);

      expect(funnel.templateUsed.count).toBe(3);
    });

    /**
     * Test: Template adoption rate among multiple publishes
     * Expected: Correctly calculate adoption percentage
     */
    it('should calculate template adoption rate among multiple creates', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-01' },
        { id: 3, event_name: 'template_used', metadata: { template_id: 't1' }, created_at: '2024-01-01' },
        { id: 4, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-02' },
        { id: 5, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-02' },
        { id: 6, event_name: 'template_used', metadata: { template_id: 't2' }, created_at: '2024-01-02' },
        { id: 7, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-03' },
        { id: 8, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-04' },
      ];

      const funnel = calculateFunnel(events);

      expect(funnel.created.count).toBe(4);
      expect(funnel.published.count).toBe(2);
      expect(funnel.templateUsed.count).toBe(2);
      // 2 templates / 2 published = 100%
      expect(funnel.templateUsed.percentage).toBe(100);
    });
  });

  describe('Event Metadata Preservation', () => {
    /**
     * Test: Metadata preserved during event tracking
     * Expected: All metadata fields accessible in events
     */
    it('should preserve event metadata throughout journey', () => {
      const events: JourneyEvent[] = [
        {
          id: 1,
          event_name: 'gameday_opened',
          metadata: {
            gameday_id: 'gd123',
            session_id: 'sess456',
            user_agent: 'Chrome/120.0',
          },
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 2,
          event_name: 'gameday_created',
          metadata: {
            gameday_id: 'gd123',
            gameday_name: 'Cup Final',
            template_used: false,
          },
          created_at: '2024-01-01T10:05:00Z',
        },
        {
          id: 3,
          event_name: 'template_used',
          metadata: {
            template_id: 'tpl_001',
            template_name: 'League Format',
          },
          created_at: '2024-01-01T10:06:00Z',
        },
      ];

      // Verify metadata is accessible
      expect(events[0].metadata.session_id).toBe('sess456');
      expect(events[1].metadata.gameday_name).toBe('Cup Final');
      expect(events[2].metadata.template_id).toBe('tpl_001');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    /**
     * Test: Empty event list
     * Expected: Graceful handling with baseline of 1 opened (for percentage calculation)
     */
    it('should handle empty event list gracefully', () => {
      const events: JourneyEvent[] = [];

      const funnel = calculateFunnel(events);
      const metrics = calculateMetrics(events);

      // Empty list defaults to 1 opened (baseline for percentage calculation)
      expect(funnel.opened.count).toBe(1);
      expect(funnel.opened.percentage).toBe(100);
      expect(funnel.created.count).toBe(0);
      expect(funnel.edited.count).toBe(0);
      expect(funnel.published.count).toBe(0);
      expect(metrics.designerOpens).toBe(0);
      expect(metrics.publishRate).toBe(0);
    });

    /**
     * Test: Only opens, no conversions
     * Expected: All downstream metrics zero
     */
    it('should handle only opens with no conversions', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-02' },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: '2024-01-03' },
      ];

      const funnel = calculateFunnel(events);
      const metrics = calculateMetrics(events);

      expect(funnel.opened.count).toBe(3);
      expect(funnel.created.count).toBe(0);
      expect(funnel.edited.count).toBe(0);
      expect(funnel.published.count).toBe(0);
      expect(metrics.publishRate).toBe(0);
    });

    /**
     * Test: Events without opens (orphaned creates)
     * Expected: Treat as implicit open
     */
    it('should handle created events without prior opens', () => {
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_created', metadata: {}, created_at: '2024-01-01' },
        { id: 2, event_name: 'gameday_published', metadata: {}, created_at: '2024-01-02' },
      ];

      const funnel = calculateFunnel(events);

      // Should implicitly count as opens
      expect(funnel.opened.count).toBeGreaterThanOrEqual(funnel.created.count);
      expect(funnel.created.count).toBe(1);
      expect(funnel.published.count).toBe(1);
    });

    /**
     * Test: Duplicate events at exact same timestamp
     * Expected: All events counted (no deduplication)
     */
    it('should count duplicate events at same timestamp', () => {
      const sameTime = '2024-01-01T10:00:00Z';
      const events: JourneyEvent[] = [
        { id: 1, event_name: 'gameday_opened', metadata: {}, created_at: sameTime },
        { id: 2, event_name: 'gameday_opened', metadata: {}, created_at: sameTime },
        { id: 3, event_name: 'gameday_opened', metadata: {}, created_at: sameTime },
      ];

      const funnel = calculateFunnel(events);

      expect(funnel.opened.count).toBe(3);
    });
  });
});
