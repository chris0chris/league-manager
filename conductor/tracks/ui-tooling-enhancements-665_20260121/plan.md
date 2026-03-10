# Plan: UI & Tooling Enhancements

## Phase 0: Critical Bugfixes (CLOSED)
Address issues found during Phase 1 & 2 manual validation.

- [x] Task: Fix Disappearing Validation Popover [647a978b] (CLOSED)
    - [x] Ensure the popover stays open when hovered and allows interaction (clicking items).
    - [x] Added 10px offset to bridge gaps and prevent flickering.
- [x] Task: Restore Metadata Warnings UI [647a978b] (CLOSED)
    - [x] Investigate why 'Venue missing' and 'Date in past' warnings don't trigger the warning badge.
- [x] Task: Verify Localization of Metadata Placeholders [647a978b] (CLOSED)
    - [x] Ensure 'Season' and 'League' select placeholders use translated strings.
- [x] Task: Fix Localization of Dynamic Team References [647a978b] (CLOSED)
    - [x] Resolve raw keys `label.ranking` and `message.placeingroup` showing in Game Table.
- [x] Task: Fix Officials Group Auto-Creation [647a978b] (CLOSED)
    - [x] Ensure "External Officials" group is created even when an initial state exists (but group is missing).
    - [x] Fixed visibility in sidebar even when group is empty.
- [x] Task: Fix Database Team Connection UI [647a978b] (CLOSED)
    - [x] Investigate why the Link icon is missing from team group headers.
    - [x] Improved button visibility (outline-secondary).

## Phase 1: Action Polish (CLOSED)
Reposition and rebrand the generation action.

- [x] Task: Rebrand and Move Generation Button (#691) [d06f76ed] (CLOSED)
    - [x] Moved button to AppHeader for high visibility.
    - [x] Rebranded to "Turnier generieren" with Magic icon.
    - [x] Added "Auto-Clear" safety warning to the generation modal.
- [x] Task: Implement Undo/Redo System [d06f76ed] (CLOSED)
    - [x] Added robust history management to `useFlowState`.
    - [x] Enabled Undo/Redo buttons in FlowToolbar.
- [x] Task: Enhanced Visibility [d06f76ed] (CLOSED)
    - [x] Added tournament statistics summary (Fields/Games/Teams) to FlowToolbar.
    - [x] Improved "Connect Team" button visibility.
- [x] Task: Filter Gameday Display (#706) [3848e6d7] (CLOSED)
    - [x] Filter gameday list to show only designer-created gamedays (checks for `designer_data`).
- [x] Task: Multi-Group Generation Fix (#697) [f61c1eac] (CLOSED)
    - [x] Implemented logic to split generated teams into separate groups (Gruppe A, B, etc.).
- [x] Task: Precise Validation Highlights (#696) [e8d64ff3] (CLOSED)
    - [x] Added pulsing highlights for individual metadata fields and section cards.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Action Polish' (Protocol in workflow.md) (CLOSED)

## Phase 2: Template Tooling (TDD) (CLOSED)
Implement the structured export feature.

- [x] Task: Implement Structure Export (#674) [3848e6d7] (DEFERRED)
    - [x] Created `exportToStructuredTemplate` utility preserving logic without specific IDs/dates.
    - [x] Added split-dropdown trigger to FlowToolbar.
    - [x] Wrote unit tests verifying portable JSON format.
    - *Comment: Deferred per user request.*
- [x] Task: Final Quality Gate [736f3327] (CLOSED)
    - [x] Run full test suite (1157 passing).
    - [x] Achieved 90.4% code coverage for gameday_designer.
    - [x] Fixed test deadlocks and infinite re-render loops.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Template Tooling' (Protocol in workflow.md) (CLOSED)
