/**
 * API types for Gameday Designer
 *
 * These types match the Django backend API models and responses.
 */

import type { Field } from './designer';

/**
 * Template slot representing a single game in the schedule template.
 * Corresponds to Django TemplateSlot model.
 */
export interface TemplateSlot {
  id: number;
  template: number;
  field: number;
  slot_order: number;
  stage: string;
  standing: string;
  home_group: number | null;
  home_team: number | null;
  home_reference: string;
  away_group: number | null;
  away_team: number | null;
  away_reference: string;
  officials_group: number | null;
  officials_team: number | null;
  officials_reference: string;
  break_after: number;
}

/**
 * Template update rule team configuration.
 * Corresponds to Django TemplateUpdateRuleTeam model.
 */
export interface TemplateUpdateRuleTeam {
  id: number;
  update_rule: number;
  role: 'home' | 'away' | 'officials';
  pre_finished_override: string;
}

/**
 * Template update rule for dynamic team assignment.
 * Corresponds to Django TemplateUpdateRule model.
 */
export interface TemplateUpdateRule {
  id: number;
  template: number;
  stage: string;
  standing: string;
  pre_finished: string;
  teams: TemplateUpdateRuleTeam[];
}

/**
 * Schedule template for gameday schedules.
 * Corresponds to Django ScheduleTemplate model.
 */
export interface ScheduleTemplate {
  id: number;
  name: string;
  num_teams: number;
  num_fields: number;
  num_groups: number;
  game_duration: number;
  association: number | null;
  association_display?: string;
  created_by: number | null;
  created_by_display?: string;
  updated_by: number | null;
  updated_by_display?: string;
  created_at: string;
  updated_at: string;
  slots?: TemplateSlot[];
  update_rules?: TemplateUpdateRule[];
}

/**
 * Validation error from backend.
 */
export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  slot_id?: number;
  field?: string;
}

/**
 * Validation result from backend.
 */
export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Application result from applying a template to a gameday.
 */
export interface ApplicationResult {
  success: boolean;
  gameday_id?: number;
  gameinfos_created?: number;
  gameresults_created?: number;
  errors?: string[];
}

/**
 * Paginated response from DRF.
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Generic API error response.
 */
export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}

/**
 * Gameday metadata for high-level management.
 * Corresponds to Django Gameday model fields.
 */
export interface GamedayMetadata {
  id: number;
  name: string;
  date: string;
  start: string;
  format: string;
  author: number;
  author_display?: string;
  address: string;
  season: number;
  season_display?: string;
  league: number;
  league_display?: string;
}

/**
 * Gameday list entry for the dashboard.
 */
export interface GamedayListEntry extends GamedayMetadata {
  status: 'draft' | 'scheduled' | 'completed';
}

/**
 * Full Gameday structure including tournament designer data.
 */
export interface Gameday extends GamedayMetadata {
  designer_data?: {
    fields: Field[]; // Matches DesignerState.fields
  };
}

/**
 * Request payload for applying a template to a gameday.
 */
export interface ApplyTemplateRequest {
  gameday_id: number;
  team_mapping: { [key: string]: number };
}

/**
 * Request payload for cloning a template.
 */
export interface CloneTemplateRequest {
  new_name: string;
  association?: number;
}

/**
 * Preview response for template application.
 */
export interface TemplatePreview {
  games: Array<{
    field: number;
    slot_order: number;
    stage: string;
    standing: string;
    home_team: string;
    away_team: string;
    officials_team: string;
  }>;
}

/**
 * Template usage statistics.
 */
export interface TemplateUsage {
  template_id: number;
  template_name: string;
  gamedays: Array<{
    id: number;
    date: string;
    association_name: string;
  }>;
  usage_count: number;
}
