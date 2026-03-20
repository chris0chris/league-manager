# Specification: Gameday Data Protection & Migration

## Overview
To safeguard existing tournament data, this track implements a migration to mark all current gamedays as `PUBLISHED`. It also introduces strict "Delete" protection across the backend and frontend, ensuring that published gamedays cannot be deleted without first being manually "Unlocked" (reverted to `DRAFT`).

## Functional Requirements

### 1. Data Migration
- Create a Django data migration that iterates through all existing `Gameday` records.
- Set the `status` field to `PUBLISHED` for all gamedays that are currently in the database (to avoid them being treated as `DRAFT` by default).

### 2. Backend Enforcement
- **Delete Protection:** Update the `Gameday` model or its associated API views to intercept deletion requests.
- **Rule:** If `gameday.status != 'DRAFT'`, the deletion must be blocked and return a relevant error (e.g., `403 Forbidden` or `400 Bad Request`) with a clear message: "Published gamedays cannot be deleted. Please unlock the gameday first."

### 3. Frontend UX & Safeguards
- **Delete Interception:** On the Gameday Dashboard (or any list where deletion is possible), intercept the delete action for gamedays where `status === 'PUBLISHED'`.
- **User Guidance:** Instead of proceeding with the deletion or the "Undo" window, show a notification or modal explaining that the gameday is protected.
- **Redirection:** Provide a direct link or redirect the user to the Gameday Designer's metadata section, where the existing "Unlock" button can be used to revert the status to `DRAFT`.

## Acceptance Criteria
- [ ] All pre-existing gamedays have `status='PUBLISHED'` after running migrations.
- [ ] Attempting to delete a published gameday via the REST API fails with an error.
- [ ] The dashboard UI prevents the deletion of published gamedays.
- [ ] Users are successfully guided to the "Unlock" button when attempting to delete protected data.
- [ ] A gameday can be deleted normally once it has been changed back to `DRAFT` status.

## Out of Scope
- Updating status for associated records like `Gameinfo` or `Gameresult` (handled via `Gameday` status).
- Modifying the core "Publish" or "Unlock" logic itself.
