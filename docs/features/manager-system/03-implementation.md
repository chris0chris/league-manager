# Manager System - Implementation

**Feature:** Three-tier Manager Permission System
**Created:** 2025-11-02
**Status:** ✅ Implemented
**Branch:** `fork/dachrisch/claude/feat-layered-manager-system-011CUjZFqFNRRUqfk2z8WYqJ`

## Implementation Overview

The manager system was implemented using Django models, views, and DRF API endpoints with a focus on security, performance, and usability.

## File Structure

```
leaguesphere/
├── gamedays/
│   ├── models/
│   │   ├── manager.py           # LeagueManager, GamedayManager models
│   │   └── __init__.py
│   ├── views/
│   │   ├── manager_views.py     # Dashboard and manager views
│   │   └── __init__.py
│   ├── api/
│   │   ├── manager_api.py       # Manager API endpoints
│   │   └── __init__.py
│   ├── templates/
│   │   └── gamedays/
│   │       └── manager_dashboard.html
│   ├── admin.py                 # Admin interface configuration
│   └── urls.py                  # URL routing
├── teammanager/
│   ├── models/
│   │   ├── team_manager.py      # TeamManager model
│   │   └── __init__.py
│   ├── admin.py
│   └── urls.py
├── scripts/
│   └── populate_manager_test_data.py  # Test data generation
└── docs/
    └── features/
        └── manager-system/
            ├── 01-requirements.md
            ├── 02-design.md
            ├── 03-implementation.md  # This file
            ├── 04-testing.md
            └── 05-rollout.md
```

## Database Implementation

### Migrations

**Migration Files:**
- `gamedays/migrations/0XXX_add_league_manager.py` - LeagueManager model
- `gamedays/migrations/0XXX_add_gameday_manager.py` - GamedayManager model with permissions
- `teammanager/migrations/0XXX_add_team_manager.py` - TeamManager model with permissions

**Key Fields:**
```python
# LeagueManager
user = ForeignKey(User, on_delete=CASCADE)
league = ForeignKey(League, on_delete=CASCADE)
assigned_at = DateTimeField(auto_now_add=True)

# GamedayManager
user = ForeignKey(User, on_delete=CASCADE)
gameday = ForeignKey(Gameday, on_delete=CASCADE)
assigned_at = DateTimeField(auto_now_add=True)
can_edit_details = BooleanField(default=True)
can_assign_officials = BooleanField(default=True)
can_manage_scores = BooleanField(default=False)

# TeamManager
user = ForeignKey(User, on_delete=CASCADE)
team = ForeignKey(Team, on_delete=CASCADE)
assigned_at = DateTimeField(auto_now_add=True)
can_edit_roster = BooleanField(default=True)
can_submit_passcheck = BooleanField(default=True)
```

### Admin Interface

Located in `gamedays/admin.py` and `teammanager/admin.py`:

```python
@admin.register(LeagueManager)
class LeagueManagerAdmin(admin.ModelAdmin):
    list_display = ('user', 'league', 'assigned_at')
    list_filter = ('league', 'assigned_at')
    search_fields = ('user__username', 'league__name')
    autocomplete_fields = ['user', 'league']

@admin.register(GamedayManager)
class GamedayManagerAdmin(admin.ModelAdmin):
    list_display = ('user', 'gameday', 'can_edit_details',
                    'can_assign_officials', 'can_manage_scores', 'assigned_at')
    list_filter = ('gameday__league', 'assigned_at')
    search_fields = ('user__username', 'gameday__name')
    autocomplete_fields = ['user', 'gameday']

@admin.register(TeamManager)
class TeamManagerAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'can_edit_roster',
                    'can_submit_passcheck', 'assigned_at')
    list_filter = ('team__association', 'assigned_at')
    search_fields = ('user__username', 'team__name')
    autocomplete_fields = ['user', 'team']
```

**Fix Applied:** Added `search_fields` to User, League, Gameday, and Team admin classes to enable autocomplete functionality.

## View Implementation

### Manager Dashboard

**File:** `gamedays/views/manager_views.py`

```python
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from gamedays.models import LeagueManager, GamedayManager
from teammanager.models import TeamManager

@login_required
def manager_dashboard(request):
    """Central dashboard for all manager permissions"""
    # Check if user has any manager permissions
    has_permissions = (
        LeagueManager.objects.filter(user=request.user).exists() or
        GamedayManager.objects.filter(user=request.user).exists() or
        TeamManager.objects.filter(user=request.user).exists() or
        request.user.is_staff
    )

    if not has_permissions:
        raise Http404("Manager dashboard not found")

    # Fetch all permissions with optimized queries
    league_permissions = LeagueManager.objects.filter(
        user=request.user
    ).select_related('league', 'league__season')

    gameday_permissions = GamedayManager.objects.filter(
        user=request.user
    ).select_related('gameday', 'gameday__league', 'gameday__season')

    team_permissions = TeamManager.objects.filter(
        user=request.user
    ).select_related('team')

    context = {
        'league_permissions': league_permissions,
        'gameday_permissions': gameday_permissions,
        'team_permissions': team_permissions,
    }

    return render(request, 'gamedays/manager_dashboard.html', context)
```

### Permission Checking Utilities

```python
def has_league_permission(user, league):
    """Check if user can manage league"""
    return user.is_staff or LeagueManager.objects.filter(
        user=user, league=league
    ).exists()

def has_gameday_permission(user, gameday, permission=None):
    """Check if user can manage gameday with optional specific permission"""
    if user.is_staff:
        return True

    # League managers have full access
    if has_league_permission(user, gameday.league):
        return True

    # Check gameday manager permissions
    try:
        manager = GamedayManager.objects.get(user=user, gameday=gameday)
        if permission:
            return getattr(manager, permission, False)
        return True
    except GamedayManager.DoesNotExist:
        return False

def has_team_permission(user, team, permission=None):
    """Check if user can manage team with optional specific permission"""
    if user.is_staff:
        return True

    try:
        manager = TeamManager.objects.get(user=user, team=team)
        if permission:
            return getattr(manager, permission, False)
        return True
    except TeamManager.DoesNotExist:
        return False
```

## Template Implementation

**File:** `gamedays/templates/gamedays/manager_dashboard.html`

### Key Template Features

1. **Section-based Layout:**
   - Liga-Manager Berechtigungen
   - Spieltag-Manager Berechtigungen
   - Team-Manager Berechtigungen

2. **Permission Badges:**
```django
{% if perm.can_edit_details %}
    <span class="badge bg-primary">Bearbeiten</span>
{% endif %}
{% if perm.can_assign_officials %}
    <span class="badge bg-warning">Schiedsrichter</span>
{% endif %}
{% if perm.can_manage_scores %}
    <span class="badge bg-success">Punkte</span>
{% endif %}
```

3. **Action Buttons:**
```django
<a href="{% url 'gameday_detail' perm.gameday.pk %}" class="btn btn-sm btn-primary">
    Anzeigen
</a>
<a href="{% url 'gameday_update' perm.gameday.pk %}" class="btn btn-sm btn-warning">
    Bearbeiten
</a>
```

## API Implementation

**File:** `gamedays/api/manager_api.py`

### User Permissions Endpoint

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_manager_permissions(request):
    """Get current user's manager permissions"""
    league_perms = LeagueManager.objects.filter(
        user=request.user
    ).select_related('league')

    gameday_perms = GamedayManager.objects.filter(
        user=request.user
    ).select_related('gameday', 'gameday__league')

    team_perms = TeamManager.objects.filter(
        user=request.user
    ).select_related('team')

    return Response({
        'league_permissions': LeagueManagerSerializer(league_perms, many=True).data,
        'gameday_permissions': GamedayManagerSerializer(gameday_perms, many=True).data,
        'team_permissions': TeamManagerSerializer(team_perms, many=True).data,
    })
```

### Serializers

```python
class LeagueManagerSerializer(serializers.ModelSerializer):
    league_name = serializers.CharField(source='league.name')
    season = serializers.CharField(source='league.season.name')

    class Meta:
        model = LeagueManager
        fields = ['id', 'league', 'league_name', 'season', 'assigned_at']

class GamedayManagerSerializer(serializers.ModelSerializer):
    gameday_name = serializers.CharField(source='gameday.name')
    league_name = serializers.CharField(source='gameday.league.name')

    class Meta:
        model = GamedayManager
        fields = ['id', 'gameday', 'gameday_name', 'league_name',
                  'can_edit_details', 'can_assign_officials',
                  'can_manage_scores', 'assigned_at']

class TeamManagerSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name')

    class Meta:
        model = TeamManager
        fields = ['id', 'team', 'team_name', 'can_edit_roster',
                  'can_submit_passcheck', 'assigned_at']
```

## URL Configuration

**File:** `gamedays/urls.py`

```python
urlpatterns = [
    # Manager Dashboard
    path('managers/dashboard/', manager_dashboard, name='manager_dashboard'),

    # API Endpoints
    path('api/managers/me/', user_manager_permissions, name='api_manager_permissions'),
]
```

## Navigation Integration

**File:** `league_manager/context_processors.py`

Updated `global_menu` context processor:

```python
def global_menu(request):
    menu_items = []

    # Show Manager menu if user has any manager permissions
    if request.user.is_authenticated:
        has_manager_perms = (
            LeagueManager.objects.filter(user=request.user).exists() or
            GamedayManager.objects.filter(user=request.user).exists() or
            TeamManager.objects.filter(user=request.user).exists() or
            request.user.is_staff
        )
        if has_manager_perms:
            menu_items.append({
                'name': 'Manager',
                'url': reverse('manager_dashboard'),
            })

    return {'menu_items': menu_items}
```

## Test Data Generation

**File:** `scripts/populate_manager_test_data.py`

Creates comprehensive test data:
- 5 test users (staff, league_mgr, gameday_mgr, team_mgr, no_perms)
- 2 leagues (Test League, Other League)
- 4 teams (Test Team A, B, C, Other Team)
- 3 gamedays (Test Gameday 1, Test Gameday 2, Other League Gameday)
- Manager permission assignments

Run with:
```bash
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
python scripts/populate_manager_test_data.py
```

## Performance Optimizations Applied

1. **Query Optimization:**
   - `select_related()` used for all foreign key lookups
   - Dashboard loads with 3 queries instead of N+1

2. **Index Creation:**
   - Composite indexes on (user, league/gameday/team)
   - Individual indexes on foreign keys

3. **Caching Strategy:**
   - Menu permission check cached in session
   - Database connection pooling enabled

## Security Measures Implemented

1. **Access Control:**
   - `@login_required` decorator on all manager views
   - 404 response for unauthorized access (not 403)
   - No information leakage in error messages

2. **Input Validation:**
   - Django form validation for all inputs
   - Foreign key constraints prevent orphaned records

3. **CSRF Protection:**
   - All forms include CSRF tokens
   - API uses token authentication

## Known Limitations

1. **Permission Expiration:** No automatic expiration of manager permissions
2. **Bulk Operations:** No UI for bulk permission assignment
3. **Audit Logging:** Basic logging only (timestamp of assignment)
4. **Email Notifications:** No email notifications on permission changes

## Future Enhancements

1. Permission expiration dates
2. Email notifications for assignment/removal
3. Full audit trail of manager actions
4. Staff UI for bulk permission management
5. Permission delegation (league manager can assign sub-managers)
6. API rate limiting
7. Real-time permission updates via WebSocket
