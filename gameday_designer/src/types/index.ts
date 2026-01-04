/**
 * Public type exports for Gameday Designer
 */

export type {
  TeamReference,
  GroupTeamReference,
  StandingReference,
  WinnerReference,
  LoserReference,
  StaticReference,
  GameSlot,
  Field,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  DesignerState,
  GameJson,
  ScheduleJson,
  ValidationErrorType,
  ValidationWarningType,
} from './designer';

export {
  isGroupTeamReference,
  isStandingReference,
  isWinnerReference,
  isLoserReference,
  isStaticReference,
  createEmptyValidationResult,
  createInitialDesignerState,
  createDefaultTeamReference,
  createDefaultGameSlot,
  createDefaultField,
} from './designer';

// API types
export type {
  ScheduleTemplate,
  TemplateSlot,
  TemplateUpdateRule,
  TemplateUpdateRuleTeam,
  ValidationError as ApiValidationError,
  ValidationResult as ApiValidationResult,
  ApplicationResult,
  PaginatedResponse,
  ApiError,
  ApplyTemplateRequest,
  CloneTemplateRequest,
  TemplatePreview,
  TemplateUsage,
} from './api';
