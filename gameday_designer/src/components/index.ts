/**
 * Component exports for Gameday Designer
 */

// Legacy slot-based components (kept for backward compatibility)
export { default as GameSlotCard } from './GameSlotCard';
export { default as FieldColumn } from './FieldColumn';
export { default as DesignerCanvas } from './DesignerCanvas';
export { default as TeamSelector } from './TeamSelector';
export { default as GameSlotEditor } from './GameSlotEditor';
export { default as ValidationPanel } from './ValidationPanel';

// Shared components (used by list-based UI)
export { default as FlowToolbar } from './FlowToolbar';
export { default as FlowPropertiesPanel } from './FlowPropertiesPanel';
export { default as FieldSidebar } from './FieldSidebar';

// New list-based components
export { default as ListCanvas } from './ListCanvas';
export { default as ListDesignerApp } from './ListDesignerApp';
export { default as FieldSection } from './list/FieldSection';
export { default as StageSection } from './list/StageSection';
export { default as TeamTable } from './list/TeamTable';
export { default as GameTable } from './list/GameTable';

// Re-export legacy types
export type { GameSlotCardProps } from './GameSlotCard';
export type { FieldColumnProps } from './FieldColumn';
export type { DesignerCanvasProps } from './DesignerCanvas';
export type { TeamSelectorProps } from './TeamSelector';
export type { GameSlotEditorProps } from './GameSlotEditor';
export type { ValidationPanelProps } from './ValidationPanel';

// Re-export shared component types
export type { FlowToolbarProps } from './FlowToolbar';
export type { FlowPropertiesPanelProps } from './FlowPropertiesPanel';
export type { FieldSidebarProps } from './FieldSidebar';

// Re-export list component types
export type { ListCanvasProps } from './ListCanvas';
export type { FieldSectionProps } from './list/FieldSection';
export type { StageSectionProps } from './list/StageSection';
export type { TeamTableProps } from './list/TeamTable';
export type { GameTableProps } from './list/GameTable';
