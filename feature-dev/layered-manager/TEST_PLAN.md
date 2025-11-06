# Manager System Test Plan

## Overview
Testing the three-tier manager permission system (League → Gameday → Team)

## Test Users
1. **staff_user** (is_staff=True) - Full access
2. **league_mgr** - League Manager for "Test League"
3. **gameday_mgr** - Gameday Manager for specific gameday
4. **team_mgr** - Team Manager for "Test Team A"
5. **no_perms** - Regular user with no manager permissions

## Test Scenarios

### 1. League Manager Functionality
**User:** league_mgr
**Permissions:** LeagueManager for "Test League" (2024 season)

**Tests:**
- [ ] Login and access manager dashboard at `/managers/dashboard/`
- [ ] See league permissions listed on dashboard
- [ ] Access gameday list for Test League
- [ ] View gameday details for league gamedays
- [ ] Access gameday update form (should work - league managers inherit)
- [ ] API: GET /api/managers/league/{league_id}/ - should list league managers
- [ ] API: POST /api/managers/gameday/{gameday_id}/ - assign gameday manager
- [ ] Cannot access gamedays from other leagues

### 2. Gameday Manager Functionality
**User:** gameday_mgr
**Permissions:** GamedayManager with permissions:
- can_edit_details: True
- can_assign_officials: True
- can_manage_scores: False

**Tests:**
- [ ] Login and access manager dashboard
- [ ] See assigned gameday in dashboard
- [ ] Access gameday update form (can edit)
- [ ] Edit gameday time/location (should work)
- [ ] Access officials assignment (should work)
- [ ] Try to manage scores via scorecard (should be denied - no permission)
- [ ] Cannot access other gamedays
- [ ] Dashboard shows correct permission badges

### 3. Team Manager Functionality
**User:** team_mgr
**Permissions:** TeamManager with permissions:
- can_edit_roster: True
- can_submit_passcheck: True

**Tests:**
- [ ] Login and access manager dashboard
- [ ] See managed team in dashboard
- [ ] Access team roster view
- [ ] Edit team roster (should work)
- [ ] Submit passcheck (should work)
- [ ] Cannot manage other teams
- [ ] Dashboard shows correct permission badges

### 4. Permission Hierarchy
**Tests:**
- [ ] Staff user can access ALL manager endpoints
- [ ] League manager can manage gamedays in their league
- [ ] League manager can assign gameday managers
- [ ] Gameday manager with partial permissions is restricted correctly
- [ ] Team manager limited to their team only

### 5. Access Control
**User:** no_perms (or anonymous)

**Tests:**
- [ ] Cannot see Manager menu item
- [ ] Redirected to login when accessing /managers/dashboard/
- [ ] API endpoints return 403 Forbidden
- [ ] Cannot access protected gameday/team management pages

### 6. Manager Dashboard UI
**Tests:**
- [ ] Dashboard shows all user's permissions
- [ ] League permissions section displays correctly
- [ ] Gameday permissions section with date/league info
- [ ] Team permissions section with team names
- [ ] Action buttons link to correct URLs
- [ ] Permission badges color-coded appropriately
- [ ] Staff users see simplified view or all options

### 7. API Endpoints
**Tests:**
- [ ] GET /api/managers/me/ - returns current user's permissions
- [ ] POST /api/managers/league/{league_id}/ - staff can assign
- [ ] DELETE /api/managers/league/{manager_id}/ - staff can remove
- [ ] POST /api/managers/gameday/{gameday_id}/ - league mgr can assign
- [ ] DELETE /api/managers/gameday/{manager_id}/ - authorized users only
- [ ] POST /api/managers/team/{team_id}/ - league mgr can assign
- [ ] DELETE /api/managers/team/{manager_id}/ - authorized users only

## Expected Behaviors

### Successful Access
- ✅ Authorized managers see green success messages
- ✅ Managers redirected to their dashboard after login
- ✅ Menu shows "Manager" item for managers
- ✅ Dashboard loads within 2 seconds

### Denied Access
- ⛔ 403 Forbidden for API calls without permission
- ⛔ Redirect to login for unauthenticated users
- ⛔ Clear error messages for insufficient permissions
- ⛔ No database queries for anonymous users

## Performance Criteria
- Dashboard loads in < 2s with 10 permissions
- API responses < 500ms
- No N+1 query issues (use select_related)

## Success Criteria
- All test scenarios pass
- No 500 errors
- Permissions enforced correctly at all levels
- UI is intuitive and responsive
