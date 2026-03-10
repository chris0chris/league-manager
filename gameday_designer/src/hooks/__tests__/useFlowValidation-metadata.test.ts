import { describe, it, expect } from 'vitest';
import { validateFlowchart } from '../useFlowValidation';
import { GamedayMetadata } from '../../types/flowchart';

describe('useFlowValidation - Metadata', () => {
  const validMetadata: GamedayMetadata = {
    id: 1,
    name: 'Valid Gameday',
    date: '2099-01-01',
    start: '10:00',
    format: '6_2',
    author: 1,
    address: 'Valid Venue',
    season: 1,
    league: 1,
    status: 'DRAFT',
  };

  it('should return errors for missing mandatory fields', () => {
    const invalidMetadata: GamedayMetadata = {
      ...validMetadata,
      name: '',
      date: '',
      start: '',
      season: 0,
      league: 0,
    };

    const result = validateFlowchart([], [], [], [], [], invalidMetadata);
    
    const errorTypes = result.errors.map(e => e.id);
    expect(errorTypes).toContain('metadata_name_missing');
    expect(errorTypes).toContain('metadata_date_missing');
    expect(errorTypes).toContain('metadata_start_missing');
    expect(errorTypes).toContain('metadata_season_missing');
    expect(errorTypes).toContain('metadata_league_missing');
    expect(result.isValid).toBe(false);
  });

  it('should return a warning for empty venue (address)', () => {
    const metadataWithoutVenue: GamedayMetadata = {
      ...validMetadata,
      address: '',
    };

    const result = validateFlowchart([], [], [], [], [], metadataWithoutVenue);
    
    const warningIds = result.warnings.map(w => w.id);
    expect(warningIds).toContain('metadata_venue_missing');
  });

  it('should return a warning for a date in the past', () => {
    const pastMetadata: GamedayMetadata = {
      ...validMetadata,
      date: '2020-01-01',
    };

    const result = validateFlowchart([], [], [], [], [], pastMetadata);
    
    const warningIds = result.warnings.map(w => w.id);
    expect(warningIds).toContain('metadata_date_in_past');
  });

  it('should be valid for today\'s date', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    const todayMetadata: GamedayMetadata = {
      ...validMetadata,
      date: todayStr,
    };

    const result = validateFlowchart([], [], [], [], [], todayMetadata);
    
    const warningIds = result.warnings.map(w => w.id);
    expect(warningIds).not.toContain('metadata_date_in_past');
  });

  it('should be valid with complete metadata and future date', () => {
    const result = validateFlowchart([], [], [], [], [], validMetadata);
    
    // Filtering out standard 'no games'/'no teams' warnings for this test
    const relevantErrors = result.errors.filter(e => e.id.startsWith('metadata_'));
    const relevantWarnings = result.warnings.filter(w => w.id.startsWith('metadata_'));
    
    expect(relevantErrors).toHaveLength(0);
    expect(relevantWarnings).toHaveLength(0);
  });
});
