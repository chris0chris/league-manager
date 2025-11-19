# Admin Configuration Bug

## Issue
The manager admin classes use `autocomplete_fields` but the referenced model admins don't have `search_fields` defined, causing a system check error:

```
<class 'gamedays.admin.GamedayManagerAdmin'>: (admin.E040) ModelAdmin must define "search_fields",
because it's referenced by GamedayManagerAdmin.autocomplete_fields.
```

## Models Affected
- User (from Django auth)
- Gameday
- League
- Season
- Team

## Current State
These models are registered with simple `admin.site.register(Model)` without search_fields.

## Fix Required
Update gamedays/admin.py to define proper ModelAdmin classes with search_fields for these models, or remove autocomplete_fields from the manager admin classes.

## Recommendation
Add proper admin classes:

```python
@admin.register(League)
class LeagueAdmin(admin.ModelAdmin):
    search_fields = ['name']
    list_display = ['name']

@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    search_fields = ['name']
    list_display = ['name']

@admin.register(Gameday)
class GamedayAdmin(admin.ModelAdmin):
    search_fields = ['name', 'league__name']
    list_display = ['name', 'league', 'season', 'date']
    list_filter = ['league', 'season']

# Note: User admin should be customized in a separate UserAdmin file if needed
# or remove 'user' from autocomplete_fields
```

## Impact
- Prevents running migrations
- Prevents starting development server
- Blocks manual testing of manager system

## Priority
HIGH - Blocking issue for testing
