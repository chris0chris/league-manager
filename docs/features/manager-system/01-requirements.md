# Manager System - Requirements

**Feature:** Three-tier Manager Permission System
**Created:** 2025-11-02
**Status:** ✅ Implemented

## Overview

LeagueSphere needs a flexible permission system that allows non-staff users to manage leagues, gamedays, and teams with granular control over their capabilities.

## Business Requirements

### BR-1: League Manager Role
**Priority:** High
**Description:** Users need the ability to manage entire leagues, including creating gamedays and managing all league-related activities.

**Acceptance Criteria:**
- League managers can view all gamedays in their league
- League managers can create and edit gamedays in their league
- League managers can assign gameday managers
- League managers can assign team managers
- League managers cannot access other leagues

### BR-2: Gameday Manager Role
**Priority:** High
**Description:** Users need the ability to manage specific gamedays with configurable permissions.

**Acceptance Criteria:**
- Gameday managers can only access their assigned gamedays
- Permissions are granular:
  - `can_edit_details`: Edit gameday information (date, time, location)
  - `can_assign_officials`: Assign officials to the gameday
  - `can_manage_scores`: Manage game scores via scorecard
- Gameday managers cannot access other gamedays
- Permission badges clearly indicate capabilities

### BR-3: Team Manager Role
**Priority:** High
**Description:** Users need the ability to manage their teams with configurable permissions.

**Acceptance Criteria:**
- Team managers can only access their assigned team
- Permissions are granular:
  - `can_edit_roster`: Edit team roster
  - `can_submit_passcheck`: Submit player passcheck
- Team managers cannot access other teams
- Permission badges clearly indicate capabilities

### BR-4: Manager Dashboard
**Priority:** High
**Description:** All managers need a centralized dashboard to view and access their permissions.

**Acceptance Criteria:**
- Dashboard shows all user's manager permissions
- Organized by permission type (League, Gameday, Team)
- Shows relevant details (league name, gameday date, team name)
- Shows permission badges for each assignment
- Provides action buttons to access managed resources
- Loads in < 2 seconds with up to 10 permissions

### BR-5: Access Control
**Priority:** Critical
**Description:** The system must prevent unauthorized access to manager functions.

**Acceptance Criteria:**
- Manager menu item only visible to users with manager permissions
- Direct URL access blocked for unauthorized users
- API endpoints protected with proper authentication
- Users without permissions see 404 errors (not 403 to avoid information leakage)
- No database queries made for anonymous users

## Technical Requirements

### TR-1: Database Models
- `LeagueManager` model with foreign keys to User and League
- `GamedayManager` model with foreign keys to User, Gameday, and permission flags
- `TeamManager` model with foreign keys to User, Team, and permission flags
- All models track creation date (`assigned_at`)

### TR-2: API Endpoints
RESTful API using Django REST Framework:
- `GET /api/managers/me/` - Get current user's permissions
- `GET /api/managers/league/{league_id}/` - List league managers
- `POST /api/managers/league/{league_id}/` - Assign league manager (staff only)
- `DELETE /api/managers/league/{manager_id}/` - Remove league manager (staff only)
- Similar endpoints for gameday and team managers

### TR-3: Performance
- Dashboard queries use `select_related()` to avoid N+1 queries
- API responses < 500ms
- Dashboard loads < 2s with 10 permissions

### TR-4: Security
- Knox token authentication for API
- Session authentication for web interface
- Permission checks at view level
- URL patterns protected with decorators/mixins

## User Stories

### US-1: League Manager Creates Gameday
**As a** league manager
**I want to** create new gamedays for my league
**So that** I can organize tournaments

### US-2: Gameday Manager Assigns Officials
**As a** gameday manager with official assignment permission
**I want to** assign officials to my gameday
**So that** games can be properly officiated

### US-3: Team Manager Updates Roster
**As a** team manager with roster edit permission
**I want to** update my team's roster
**So that** player information is current

### US-4: User Views Dashboard
**As a** user with manager permissions
**I want to** see all my management responsibilities in one place
**So that** I can quickly access what I need to manage

## Non-Functional Requirements

### NFR-1: Usability
- UI in German language
- Color-coded permission badges (blue: primary, yellow: secondary)
- Clear action buttons
- Intuitive navigation

### NFR-2: Maintainability
- Well-documented code
- Reusable permission checking utilities
- Separate apps/modules for manager functionality

### NFR-3: Scalability
- System supports up to 100 managers per league
- Dashboard handles up to 50 permissions per user
- Database queries optimized with indexes

## Out of Scope

- Manager permission expiration dates (future enhancement)
- Email notifications for permission assignments (future enhancement)
- Audit logging of manager actions (future enhancement)
- Staff user interface for bulk permission assignment (future enhancement)

## Success Criteria

- All user roles tested and working
- Dashboard loads < 2s
- No unauthorized access possible
- Permission badges accurately reflect capabilities
- No 500 errors during normal operation
- Test coverage > 80%
