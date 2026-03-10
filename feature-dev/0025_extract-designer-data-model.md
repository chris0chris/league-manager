# Extract designer_data from Gameday Model to Dedicated Model

## Context

The `designer_data` JSONField currently lives directly on the `Gameday` model (added in migration `0025_gameday_designer_data.py`). This field stores draft/visual state for the React gameday designer UI.

**Goal**: Extract `designer_data` into a separate `GamedayDesignerState` model to improve separation of concerns while maintaining API compatibility and zero frontend changes.

**Deployment Strategy**: Multi-phase approach without automated data migration:
1. **Phase 1** (Deploy immediately): Deploy new model alongside old field (write to both, read from new with fallback)
2. **Phase 2** (Same day after Phase 1 stable): Manual data migration in production
3. **Phase 3** (1-7 days after Phase 2): Remove old field after verification
4. **Phase 4** (Immediately after Phase 3): Clean up old migration file (0025_gameday_designer_data.py)

**Why Phased?**
- Allows verification at each step
- Reduces risk of data loss
- Can rollback individual phases if issues arise
- No downtime required

## Current Architecture

**Gameday Model**:
```python
# gamedays/models.py
class Gameday(models.Model):
    designer_data = models.JSONField(null=True, blank=True)
```

**Data Structure**:
```json
{
  "nodes": [...],      // game, stage, field nodes
  "edges": [...],      // connections between nodes
  "globalTeams": [...] // team definitions
}
```

**Current Usage**:
- `gamedays/api/serializers.py` - `GamedaySerializer` includes designer_data
- `gamedays/api/views.py` - `GamedayViewSet.publish()` reads designer_data
- `gamedays/service/gameday_service.py` - `get_resolved_designer_data()` processes it
- Frontend: `gameday_designer/src/api/gamedayApi.ts` - PATCH `/api/gamedays/{id}/` with designer_data

## Implementation Plan

### 1. Create New Model (gamedays app)

**File**: `gamedays/models.py`

Add new model:
```python
class GamedayDesignerState(models.Model):
    """Visual designer state for draft gamedays."""

    gameday = models.OneToOneField(
        Gameday,
        on_delete=models.CASCADE,
        related_name='designer_state',
        primary_key=True
    )

    state_data = models.JSONField(
        default=dict,
        help_text="React Flow designer state (nodes, edges, teams)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'gamedays_designer_state'
```

**Why JSONField?** Keeps flexibility for UI evolution, matches frontend structure exactly, single read/write operation.

### 2. Create Migration (Model Only - Keep Old Field)

**Phase 1 Migration** - Create new model only, keep old field:
```python
# gamedays/migrations/0028_gamedaydesignerstate.py

from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('gamedays', '0027_previous_migration'),  # Update with actual previous migration
        ('auth', '0012_alter_user_first_name_max_length'),  # For User FK
    ]

    operations = [
        migrations.CreateModel(
            name='GamedayDesignerState',
            fields=[
                ('gameday', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    primary_key=True,
                    related_name='designer_state',
                    serialize=False,
                    to='gamedays.gameday'
                )),
                ('state_data', models.JSONField(
                    default=dict,
                    help_text='React Flow designer state (nodes, edges, teams)'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_modified_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='auth.user'
                )),
            ],
            options={
                'db_table': 'gamedays_designer_state',
            },
        ),
    ]
```

**Note**: Old `designer_data` field remains on Gameday model for now. We'll remove it in Phase 3.

### 3. Update Serializers (Phase 1: Write to Both)

**File**: `gamedays/api/serializers.py`

Update `GamedaySerializer` to write to BOTH old field and new model:
```python
class GamedaySerializer(ModelSerializer):
    designer_data = SerializerMethodField()  # Read

    def get_designer_data(self, instance):
        # Read from new model, fallback to old field
        if hasattr(instance, 'designer_state'):
            return GamedayService.create(instance.pk).get_resolved_designer_data(instance.pk)
        # Fallback for data not yet migrated
        elif instance.designer_data:
            return instance.designer_data
        return None

    def update(self, instance, validated_data):
        designer_data = self.initial_data.get('designer_data')

        if designer_data is not None:
            # Write to BOTH places during transition
            # 1. Update old field (for safety during migration)
            validated_data['designer_data'] = designer_data

            # 2. Create or update new model
            if hasattr(instance, 'designer_state'):
                state = instance.designer_state
                state.state_data = designer_data
                state.last_modified_by = self.context['request'].user
                state.save()
            else:
                GamedayDesignerState.objects.create(
                    gameday=instance,
                    state_data=designer_data,
                    last_modified_by=self.context['request'].user
                )

        return super().update(instance, validated_data)
```

**API Impact**: ZERO - frontend continues using `PATCH /api/gamedays/{id}/` with `{"designer_data": {...}}`

### 4. Update Views (Phase 1: Read with Fallback)

**File**: `gamedays/api/views.py`

Update `publish()` action with fallback:
```python
@action(detail=True, methods=["post"])
def publish(self, request, pk=None):
    gameday = self.get_object()

    # Read from new model, fallback to old field
    if hasattr(gameday, 'designer_state'):
        designer_data = gameday.designer_state.state_data
    elif gameday.designer_data:
        designer_data = gameday.designer_data
    else:
        return Response(
            {"detail": "No designer state found for this gameday."},
            status=status.HTTP_400_BAD_REQUEST
        )

    nodes = designer_data.get("nodes", [])

    # ... rest of publish logic unchanged ...

    # Write to BOTH places during transition
    gameday.designer_data = designer_data
    gameday.save()

    if hasattr(gameday, 'designer_state'):
        gameday.designer_state.state_data = designer_data
        gameday.designer_state.save()
```

### 5. Update Service Layer (Phase 1: Read with Fallback)

**File**: `gamedays/service/gameday_service.py`

Update `get_resolved_designer_data()` with fallback:
```python
def get_resolved_designer_data(self, gameday_pk=None):
    try:
        gameday = self.gameday if not gameday_pk else Gameday.objects.get(pk=gameday_pk)

        # Read from new model, fallback to old field
        if hasattr(gameday, 'designer_state'):
            data = gameday.designer_state.state_data
        elif gameday.designer_data:
            data = gameday.designer_data
        else:
            return {"nodes": [], "edges": []}

        # ... resolution logic unchanged ...
        return data
    except Gameday.DoesNotExist:
        return {"nodes": [], "edges": []}
```

### 6. Testing

**Unit Tests** (`gamedays/tests/test_designer_state.py`):
- Create designer state for gameday
- Cascade delete when gameday deleted
- One-to-one constraint enforcement
- Dual-write behavior (both old and new storage updated)

**Integration Tests** (`gamedays/api/tests/test_designer_state_api.py`):
- **Phase 1 (Dual Write)**:
  - PATCH gameday with designer_data creates/updates BOTH old field and new model
  - Read from new model when available, fallback to old field
  - Publish action works with both new model and old field
- **Phase 3 (After Field Removal)**:
  - Update tests to remove old field references
  - Verify only new model is used

**Test Data Scenarios**:
- Gameday with only old field (pre-migration)
- Gameday with both old field and new model (during migration)
- Gameday with only new model (post-migration)

### 7. Deployment Strategy (Multi-Phase)

**Phase 1: Deploy New Model (Keep Old Field)**

1. Deploy code with Phase 1 changes (serializers, views, services write to BOTH)
2. Run migration `0028_gamedaydesignerstate.py` (creates new model only)
3. Verify: New gameday updates create designer_state records
4. Monitor: Both old and new storage working

**Phase 2: Manual Data Migration in Production**

Create management command to migrate existing data:

```python
# gamedays/management/commands/migrate_designer_data.py
from django.core.management.base import BaseCommand
from gamedays.models import Gameday, GamedayDesignerState

class Command(BaseCommand):
    help = 'Migrate designer_data from Gameday to GamedayDesignerState'

    def handle(self, *args, **options):
        migrated = 0
        skipped = 0

        for gameday in Gameday.objects.filter(designer_data__isnull=False):
            if not gameday.designer_data:
                continue

            # Skip if already migrated
            if hasattr(gameday, 'designer_state'):
                skipped += 1
                continue

            GamedayDesignerState.objects.create(
                gameday=gameday,
                state_data=gameday.designer_data
            )
            migrated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Migrated {migrated} records, skipped {skipped}')
        )
```

Run in production:
```bash
python manage.py migrate_designer_data
```

Verify all data migrated:
```python
# Check counts match
old_count = Gameday.objects.filter(designer_data__isnull=False).exclude(designer_data={}).count()
new_count = GamedayDesignerState.objects.count()
# old_count should equal new_count
```

**Phase 3: Remove Old Field**

After data migration verified successful:

1. Update code to remove fallbacks (read only from designer_state)
2. Create migration to remove old field:
```python
# gamedays/migrations/0029_remove_gameday_designer_data.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('gamedays', '0028_gamedaydesignerstate'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='gameday',
            name='designer_data',
        ),
    ]
```
3. Deploy to production
4. Run migration

**Phase 4: Clean Up Old Migration**

After production deployment successful:

1. Delete old migration file: `gamedays/migrations/0025_gameday_designer_data.py`
2. This is safe because:
   - Field has been removed from database
   - Migration history no longer needs this migration
   - New environments will use squashed migrations or latest schema
3. Update migration dependencies if needed
4. Commit cleanup changes

### 8. Verification Checklist

**Phase 1 Verification (After First Deploy)**:
- [ ] All tests passing (unit + integration)
- [ ] New gameday updates create designer_state records
- [ ] Old gamedays still work (read from old field)
- [ ] Publish action works without errors
- [ ] Frontend designer UI functions normally

**Phase 2 Verification (After Data Migration)**:
- [ ] All gamedays with designer_data have designer_state
- [ ] Count matches: `Gameday.objects.filter(designer_data__isnull=False).count() == GamedayDesignerState.objects.count()`
- [ ] Spot check: Random gameday has matching data in both places
- [ ] No errors in production logs

**Phase 3 Verification (After Field Removal)**:
- [ ] All tests passing
- [ ] No references to `designer_data` field in code
- [ ] Production running without errors
- [ ] Frontend continues working

**Phase 4 Verification (After Migration Cleanup)**:
- [ ] Fresh database migrations work (`python manage.py migrate --run-syncdb`)
- [ ] Old migration file removed from repo
- [ ] No broken migration dependencies

## Risk Mitigation

**Phase 1 Risks**:
- Risk: New code breaks existing functionality
- Mitigation: Dual-write ensures old field still works, fallback logic in read paths

**Phase 2 Risks**:
- Risk: Data migration fails or misses records
- Mitigation: Management command is idempotent, verification queries before Phase 3

**Phase 3 Risks**:
- Risk: Some code still references old field
- Mitigation: Comprehensive grep for `designer_data` before field removal

**Phase 4 Risks**:
- Risk: Removing old migration breaks fresh installations
- Mitigation: Only remove after field is gone from database schema

**Rollback Plan**:
- Phase 1: Can rollback code, new table empty/minimal data
- Phase 2: No code changes, just data copy (safe to retry)
- Phase 3: Can rollback migration, but need to restore old field
- Phase 4: Git revert is simple (just a file deletion)

## Benefits

1. **Separation of Concerns** - Designer state isolated from core Gameday model
2. **Data Integrity** - One-to-one relationship enforced at database level
3. **Auditability** - Track who modified designer state and when
4. **Backward Compatible** - Zero frontend changes required
5. **Maintainable** - Clear ownership, isolated testing
6. **Future-proof** - Can add fields (version, snapshot history) without touching Gameday
7. **Safe Migration** - Multi-phase approach reduces risk compared to single big-bang migration

## Critical Files

**Phase 1 (Initial Deploy)**:
- `/home/cda/dev/leaguesphere/gamedays/models.py` - Add GamedayDesignerState model
- `/home/cda/dev/leaguesphere/gamedays/api/serializers.py` - Update GamedaySerializer (write to both)
- `/home/cda/dev/leaguesphere/gamedays/api/views.py` - Update publish() action (read with fallback)
- `/home/cda/dev/leaguesphere/gamedays/service/gameday_service.py` - Update get_resolved_designer_data() (read with fallback)
- `/home/cda/dev/leaguesphere/gamedays/migrations/0028_gamedaydesignerstate.py` - Create new model
- `/home/cda/dev/leaguesphere/gamedays/tests/test_designer_state.py` - New tests

**Phase 2 (Data Migration)**:
- `/home/cda/dev/leaguesphere/gamedays/management/commands/migrate_designer_data.py` - Manual migration command

**Phase 3 (Field Removal)**:
- `/home/cda/dev/leaguesphere/gamedays/models.py` - Remove designer_data field
- `/home/cda/dev/leaguesphere/gamedays/api/serializers.py` - Remove fallback logic
- `/home/cda/dev/leaguesphere/gamedays/api/views.py` - Remove fallback logic
- `/home/cda/dev/leaguesphere/gamedays/service/gameday_service.py` - Remove fallback logic
- `/home/cda/dev/leaguesphere/gamedays/migrations/0029_remove_gameday_designer_data.py` - Remove old field

**Phase 4 (Cleanup)**:
- Delete: `/home/cda/dev/leaguesphere/gamedays/migrations/0025_gameday_designer_data.py`
