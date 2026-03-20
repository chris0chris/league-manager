# Implementation Plan: Gameday Data Protection & Migration

## Phase 1: Backend Migration and Enforcement
- [x] Task: Backend - Create failing tests for delete protection
    - [x] Add test case to `gamedays/tests/test_api.py` (or relevant file) to verify that deleting a `PUBLISHED` gameday returns an error.
    - [x] Verify tests fail as expected.
- [x] Task: Backend - Implement Delete Protection
    - [x] Update `Gameday` model `delete()` method or the API View `destroy()` method to block deletion if status is not `DRAFT`.
    - [x] Ensure appropriate error message and status code are returned.
    - [x] Verify tests pass.
- [x] Task: Backend - Data Migration
    - [x] Generate a new Django data migration: `python manage.py makemigrations gamedays --empty --name set_existing_gamedays_published`.
    - [x] Implement logic to update all existing `Gameday` records to `PUBLISHED` status.
    - [x] Run migration and verify database state.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Migration and Enforcement' (Protocol in workflow.md)

## Phase 2: Frontend Safeguards
- [x] Task: Frontend - Create failing tests for delete interception
    - [x] Add integration tests in `gameday_designer/src/components/dashboard/__tests__/` to verify the dashboard prevents deletion of published gamedays.
    - [x] Verify tests fail as expected.
- [x] Task: Frontend - Implement Dashboard Delete Protection
    - [x] Update delete handler in `GamedayDashboard.tsx` to check status before proceeding.
    - [x] If status is `PUBLISHED`, trigger a Toast notification with instructions.
- [x] Task: Frontend - User Guidance & Redirect
    - [x] Add a link or button in the Toast notification to navigate directly to the Designer for that gameday.
    - [x] Verify that once \"Unlocked\" in the Designer, the gameday can be deleted from the dashboard.
    - [x] Verify all tests pass.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Safeguards' (Protocol in workflow.md)
