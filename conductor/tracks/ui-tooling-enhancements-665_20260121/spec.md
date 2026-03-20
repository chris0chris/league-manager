# Specification: UI & Tooling Enhancements

## Overview
This track focuses on improving the Gameday Designer's tooling and overall user flow. This includes rebranding and repositioning the tournament generation trigger for better discoverability and implementing a template export feature to enable schedule reuse.

## Functional Requirements
- **Improve Generation Discoverability (#691):**
    - Rename the "Generate Tournament" (Turnier generieren) button to "Generate Gameday" (Spieltag generieren).
    - Move the button to a more prominent location next to the "Create Gameday" action or within the main dashboard header to improve visibility.
- **Implement Template Structure Export (#674):**
    - Finalize the implementation of the "Export" button.
    - When clicked, the application should generate a JSON export of the current gameday's *structure* (fields, stages, progression mapping) rather than just raw game data.
    - The exported structure should be in a format suitable for re-importing as a template for other gamedays.

## Acceptance Criteria
- "Generate Gameday" button is clearly visible and logically positioned.
- Export feature produces valid JSON representing the gameday template structure.
- Exported templates can be successfully processed by the internal `flowchartImport` utility.

## Out of Scope
- Backend implementation of a template marketplace or shared template database.
- Changes to the core gameday metadata fields.
