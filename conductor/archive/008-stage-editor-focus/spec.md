# Specification: Stage Editor Focus & Interaction Fix

## Overview
Fix a bug where interacting with the Stage Type dropdown during edit mode causes the name input to lose focus, triggering an automatic save/close and preventing the user from changing the type. Additionally, improve the visual feedback of the active editing area.

## Functional Requirements
1. **Smart Focus Management**:
   - **Requirement**: The edit mode should not automatically close if the user clicks on other interactive elements within the editing zone (like the Stage Type dropdown).
   - **Logic**: Use a "Smart Blur" approach where `onBlur` only triggers a save if the `relatedTarget` (the element gaining focus) is outside the stage header's interactive area.

2. **Editing Zone Visual Feedback**:
   - **Requirement**: When in edit mode, the entire area containing the type dropdown, name input, and save/cancel buttons should have a subtle background highlight.
   - **Aesthetic**: Use a light primary or warning background (e.g., `rgba(13, 110, 253, 0.05)`) to clearly define the "Active Editing Zone".

## Acceptance Criteria
- [ ] Clicking the Stage Type dropdown while editing the name does NOT close the edit mode.
- [ ] The user can successfully change the stage type and then click Save.
- [ ] The editing area has a distinct background color during the edit session.
- [ ] Clicking entirely outside the stage header still triggers an automatic save (preserving existing UX).
