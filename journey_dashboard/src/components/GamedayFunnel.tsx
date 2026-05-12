import React from 'react';
import { JourneyEvent } from '../types';
import './GamedayFunnel.css';

export interface FunnelStage {
  count: number;
  percentage: number;
}

export interface FunnelData {
  opened: FunnelStage;
  created: FunnelStage;
  edited: FunnelStage;
  published: FunnelStage;
  templateUsed: FunnelStage;
}

/**
 * Calculate conversion funnel from journey events
 * @param events - Array of JourneyEvent objects
 * @returns FunnelData object with stages and percentages
 */
export function calculateFunnel(events: JourneyEvent[]): FunnelData {
  // Count events for each stage
  const openedCount = events.filter(e => e.event_name === 'gameday_opened').length || 1; // Baseline: 100%
  const createdCount = events.filter(e => e.event_name === 'gameday_created').length;
  const editedCount = events.filter(e => e.event_name === 'gameday_edited').length;
  const publishedCount = events.filter(e => e.event_name === 'gameday_published').length;
  const templateUsedCount = events.filter(e => e.event_name === 'template_used').length;

  return {
    opened: {
      count: openedCount,
      percentage: 100, // Baseline = 100%
    },
    created: {
      count: createdCount,
      percentage: openedCount > 0 ? (createdCount / openedCount) * 100 : 0,
    },
    edited: {
      count: editedCount,
      percentage: createdCount > 0 ? (editedCount / createdCount) * 100 : 0,
    },
    published: {
      count: publishedCount,
      percentage: editedCount > 0 ? (publishedCount / editedCount) * 100 : 0,
    },
    templateUsed: {
      count: templateUsedCount,
      percentage: publishedCount > 0 ? (templateUsedCount / publishedCount) * 100 : 0,
    },
  };
}

interface GamedayFunnelProps {
  events: JourneyEvent[];
}

/**
 * React component to display gameday conversion funnel
 * Shows progression from opened → created → edited → published
 * Includes template adoption as a separate branch
 */
export const GamedayFunnel: React.FC<GamedayFunnelProps> = ({ events }) => {
  const funnel = calculateFunnel(events);

  const stages = [
    { key: 'opened', label: 'Opened', data: funnel.opened, color: '#0d6efd' },
    { key: 'created', label: 'Created', data: funnel.created, color: '#198754' },
    { key: 'edited', label: 'Edited', data: funnel.edited, color: '#ffc107' },
    { key: 'published', label: 'Published', data: funnel.published, color: '#dc3545' },
    { key: 'templateUsed', label: 'Template Used', data: funnel.templateUsed, color: '#0d6efd', isTemplate: true },
  ];

  return (
    <div className="gameday-funnel">
      <h2 className="funnel-title">Gameday Conversion Funnel</h2>
      <div className="funnel-container">
        {stages.map((stage, index) => {
          const widthPercentage = Math.max(stage.data.percentage, 5); // Minimum 5% for visibility
          const isLastRegularStage = index === 3;

          return (
            <div
              key={stage.key}
              className={`funnel-stage ${stage.isTemplate ? 'template-branch' : ''}`}
            >
              <div className="stage-label">{stage.label}</div>
              <div className="bar-container">
                <div
                  className={`bar ${stage.isTemplate ? 'template-bar' : ''}`}
                  style={{
                    width: `${widthPercentage}%`,
                    backgroundColor: stage.color,
                  }}
                >
                  <span className="bar-text">
                    {stage.data.count} ({Math.round(stage.data.percentage * 10) / 10}%)
                  </span>
                </div>
              </div>
              {isLastRegularStage && stage.isTemplate !== true && (
                <div className="funnel-divider">Template Branch</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
