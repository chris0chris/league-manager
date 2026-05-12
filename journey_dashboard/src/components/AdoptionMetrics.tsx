import React from 'react';
import { JourneyEvent } from '../types';
import './AdoptionMetrics.css';

export interface MetricsData {
  designerOpens: number;
  publishRate: number;
  templateAdoptionRate: number;
}

/**
 * Calculate adoption metrics from journey events
 * @param events - Array of JourneyEvent objects
 * @returns MetricsData object with adoption metrics
 */
export function calculateMetrics(events: JourneyEvent[]): MetricsData {
  // Count unique gamedays opened (count of gameday_opened events)
  const designerOpens = events.filter(e => e.event_name === 'gameday_opened').length || 0;

  // Count gamedays published
  const publishedCount = events.filter(e => e.event_name === 'gameday_published').length;

  // Calculate publish rate as percentage of opens
  const publishRate = designerOpens > 0 ? (publishedCount / designerOpens) * 100 : 0;

  // Count template usage
  const templateUsedCount = events.filter(e => e.event_name === 'template_used').length;

  // Calculate template adoption as percentage of opens
  const templateAdoptionRate = designerOpens > 0 ? (templateUsedCount / designerOpens) * 100 : 0;

  return {
    designerOpens,
    publishRate,
    templateAdoptionRate,
  };
}

interface AdoptionMetricsProps {
  events: JourneyEvent[];
}

/**
 * React component to display adoption metrics
 * Shows designer opens, publish rate, and template adoption rate
 */
export const AdoptionMetrics: React.FC<AdoptionMetricsProps> = ({ events }) => {
  const metrics = calculateMetrics(events);

  const cards = [
    {
      key: 'opens',
      value: metrics.designerOpens,
      label: 'Designer Opens',
      description: 'Number of times gameday designer was opened',
      color: '#0d6efd',
    },
    {
      key: 'publishRate',
      value: `${Math.round(metrics.publishRate * 10) / 10}%`,
      label: 'Publish Rate',
      description: 'Percentage of opens that resulted in published gamedays',
      color: '#198754',
    },
    {
      key: 'templateAdoption',
      value: `${Math.round(metrics.templateAdoptionRate * 10) / 10}%`,
      label: 'Template Adoption',
      description: 'Percentage of opens that used templates',
      color: '#dc3545',
    },
  ];

  return (
    <div className="adoption-metrics">
      <h2 className="metrics-title">Adoption Metrics</h2>
      <div className="metrics-grid">
        {cards.map((card) => (
          <div key={card.key} className="metric-card" style={{ borderLeftColor: card.color }}>
            <div className="metric-value" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="metric-label">{card.label}</div>
            <div className="metric-description">{card.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
