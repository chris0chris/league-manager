# Manager System - Design

**Feature:** Three-tier Manager Permission System
**Created:** 2025-11-02
**Status:** ✅ Implemented

## Architecture Overview

The manager system follows a three-tier hierarchy:

```
League Manager (Top Level)
    ↓ Can manage entire league
    ↓ Can assign gameday managers
    ↓ Can assign team managers

Gameday Manager (Mid Level)
    ↓ Manages specific gamedays
    ↓ Granular permissions

Team Manager (Bottom Level)
    ↓ Manages specific teams
    ↓ Granular permissions
```

## Database Design

### Models

#### LeagueManager
```python
class LeagueManager(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    league = models.ForeignKey(League, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'league')
```

#### GamedayManager
```python
class GamedayManager(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    gameday = models.ForeignKey(Gameday, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)

    # Granular permissions
    can_edit_details = models.BooleanField(default=True)
    can_assign_officials = models.BooleanField(default=True)
    can_manage_scores = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'gameday')
```

#### TeamManager
```python
class TeamManager(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)

    # Granular permissions
    can_edit_roster = models.BooleanField(default=True)
    can_submit_passcheck = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'team')
```

### Database Relationships

```
User (1) ─── (N) LeagueManager (N) ─── (1) League
User (1) ─── (N) GamedayManager (N) ─── (1) Gameday
User (1) ─── (N) TeamManager (N) ─── (1) Team
```

### Indexes
- `user_id` indexed on all manager models
- `league_id`, `gameday_id`, `team_id` indexed for lookups
- Composite unique indexes on (user, resource) pairs

## API Design

### Endpoints

#### Manager Permissions
```
GET  /api/managers/me/
Response: {
    "league_permissions": [...],
    "gameday_permissions": [...],
    "team_permissions": [...]
}
```

#### League Managers
```
GET    /api/managers/league/{league_id}/      # List managers
POST   /api/managers/league/{league_id}/      # Assign manager (staff only)
DELETE /api/managers/league/{manager_id}/     # Remove manager (staff only)
```

#### Gameday Managers
```
GET    /api/managers/gameday/{gameday_id}/    # List managers
POST   /api/managers/gameday/{gameday_id}/    # Assign manager (league mgr or staff)
PATCH  /api/managers/gameday/{manager_id}/    # Update permissions
DELETE /api/managers/gameday/{manager_id}/    # Remove manager
```

#### Team Managers
```
GET    /api/managers/team/{team_id}/          # List managers
POST   /api/managers/team/{team_id}/          # Assign manager (league mgr or staff)
PATCH  /api/managers/team/{manager_id}/       # Update permissions
DELETE /api/managers/team/{manager_id}/       # Remove manager
```

### Authentication
- **Web UI:** Django session authentication
- **API:** Knox token authentication
- **Permissions:** Custom permission classes based on manager models

## UI Design

### Manager Dashboard Layout

```
┌─────────────────────────────────────────┐
│  Manager Dashboard                      │
│  Überblick über Ihre Verwaltungsrechte │
├─────────────────────────────────────────┤
│                                         │
│  Liga-Manager Berechtigungen            │
│  ┌───────────────────────────────────┐ │
│  │ Liga     │ Saison │ Seit │ Aktionen││
│  │ Test Lg  │ 2024   │ ... │ [Button]││
│  └───────────────────────────────────┘ │
│                                         │
│  Spieltag-Manager Berechtigungen        │
│  ┌───────────────────────────────────┐ │
│  │ Spieltag │Datum│Liga│Rechte│Akt.  ││
│  │ GD1      │...  │TL  │[🔵🟡]│[Btn] ││
│  └───────────────────────────────────┘ │
│                                         │
│  Team-Manager Berechtigungen            │
│  ┌───────────────────────────────────┐ │
│  │ Team     │ Rechte  │ Seit │ Aktionen││
│  │ Team A   │ [🔵🟡]  │ ...  │ [Button]││
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Permission Badge Colors
- **Blue (Primary):** Core management actions
  - "Bearbeiten" (Edit details)
  - "Kader" (Roster)
- **Yellow (Secondary):** Additional actions
  - "Schiedsrichter" (Officials)
  - "Passkontrolle" (Passcheck)

### Navigation
- **Manager Menu Item:** Only visible to users with manager permissions
- **Dropdown:** Shows "Manager Dashboard" link
- **Dashboard:** Central hub for all manager functions

## Permission Checking Logic

### View-Level Checks

```python
def has_league_permission(user, league):
    """Check if user is league manager or staff"""
    return user.is_staff or LeagueManager.objects.filter(
        user=user, league=league
    ).exists()

def has_gameday_permission(user, gameday, permission=None):
    """Check if user can manage gameday with specific permission"""
    if user.is_staff:
        return True

    # Check league manager
    if has_league_permission(user, gameday.league):
        return True

    # Check gameday manager
    try:
        manager = GamedayManager.objects.get(user=user, gameday=gameday)
        if permission:
            return getattr(manager, permission, False)
        return True
    except GamedayManager.DoesNotExist:
        return False

def has_team_permission(user, team, permission=None):
    """Check if user can manage team with specific permission"""
    if user.is_staff:
        return True

    # Check team manager
    try:
        manager = TeamManager.objects.get(user=user, team=team)
        if permission:
            return getattr(manager, permission, False)
        return True
    except TeamManager.DoesNotExist:
        return False
```

### URL Pattern Protection

```python
# Decorators for function-based views
@require_manager_permission
def dashboard_view(request):
    pass

# Mixins for class-based views
class GamedayUpdateView(ManagerPermissionMixin, UpdateView):
    required_permission = 'can_edit_details'
```

## Performance Optimizations

### Query Optimization
```python
# Dashboard view - single query with select_related
league_permissions = LeagueManager.objects.filter(
    user=request.user
).select_related('league', 'league__season')

gameday_permissions = GamedayManager.objects.filter(
    user=request.user
).select_related('gameday', 'gameday__league')

team_permissions = TeamManager.objects.filter(
    user=request.user
).select_related('team')
```

### Caching Strategy
- Manager permissions cached in user session
- Cache invalidated on permission changes
- Dashboard data cached for 5 minutes

## Security Considerations

### Access Control
1. **URL Protection:** All manager URLs require authentication
2. **Object-Level Permissions:** Check specific resource access
3. **404 vs 403:** Return 404 for unauthorized access to avoid information leakage
4. **CSRF Protection:** All forms include CSRF tokens
5. **SQL Injection:** ORM prevents SQL injection
6. **XSS Protection:** Template escaping enabled

### Audit Trail
- All permission assignments logged with timestamp
- `assigned_at` field tracks when permissions granted
- Future enhancement: Full audit log of manager actions

## Error Handling

### HTTP Status Codes
- `200 OK` - Successful request
- `201 Created` - Permission assigned successfully
- `204 No Content` - Permission deleted successfully
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - API permission denied
- `404 Not Found` - Resource or permission not found

### User-Facing Error Messages
- German language
- Clear explanation of the issue
- Guidance on how to resolve (where applicable)
- No technical details exposed

## Testing Strategy

### Unit Tests
- Model validation tests
- Permission checking logic tests
- API endpoint tests

### Integration Tests
- Dashboard rendering tests
- Full permission flow tests
- Access control tests

### Browser Tests (Chrome MCP)
- Login/logout flows
- Dashboard navigation
- Permission badge display
- Access denial scenarios

## Monitoring & Metrics

### Key Metrics
- Dashboard load time
- API response times
- Permission check execution time
- Failed authorization attempts

### Alerts
- Elevated 404 rates (potential security probes)
- Slow dashboard queries (> 2s)
- Database connection errors
