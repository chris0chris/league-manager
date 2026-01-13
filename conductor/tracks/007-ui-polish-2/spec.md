# Specification: Gameday Designer UI/UX Refinements (Round 2)

## Overview
Polish the Gameday Designer UI based on feedback regarding layout, alignment, and legibility. Key focus areas are the field grid responsiveness, stage editor ergonomics, and stage type visibility.

## Functional Requirements
1. **Enhanced Grid Breakpoint**:
   - **Constraint**: The 2-column layout for fields must only activate when there is sufficient width to clearly display the game name, time, and three team names (Home, Away, Official).
   - **Threshold**: Increase the breakpoint for 2-column mode to approximately **2800px** total viewport width. Below this, fields will stack in a single column at 100% width.

2. **Stage Editor Ergonomics**:
   - **Alignment**: The "Save" (check) and "Cancel" (x) buttons in the Stage Header must be moved from the right side to be placed **directly after the Stage Name input field**.
   - **Interaction**: The order should be: `[Stage Type Select] [Stage Name Input] [Save Button] [Cancel Button]`.

3. **Stage Type Visibility**:
   - **Label Fix**: Update the translation key `label.type` to display a proper user-facing string (e.g., "Phasentyp" / "Phase Type").
   - **Chip Legibility**: Increase the font size of the Stage Type Badge (Ranking/Standard) to at least `0.85rem` to ensure it is easily readable.

## Acceptance Criteria
- [ ] Fields only split into two columns when the screen is wide enough (>= 2800px).
- [ ] Save/Cancel buttons appear immediately to the right of the name input during stage editing.
- [ ] The "label.type" placeholder is replaced with actual translated text.
- [ ] The Ranking/Standard badges are larger and more readable.