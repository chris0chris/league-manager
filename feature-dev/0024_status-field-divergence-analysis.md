# Status Field Divergence Analysis

**Date:** 2026-02-13
**Status:** Analysis Complete - Plan to be Developed
**Migrations:** 0024-0027

## Executive Summary

Migrations 0024-0027 introduced a status lifecycle system for gamedays and games, but created a design divergence between `Gameday` and `Gameinfo` models. The Gameday model uses English status values with proper Django choices, while Gameinfo retained legacy German status values without constraints. This creates confusion, redundant code, and misleading constant names.

---

## Migration Overview

### Migration 0024: Gameday Lifecycle Management
**File:** `gamedays/migrations/0024_gameday_published_at_gameday_status_and_more.py`

**Purpose:** Implement proper lifecycle management for gamedays and games.

**Changes:**
- **Gameday.status** - State machine: DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED
- **Gameday.published_at** - Timestamp for when schedules go live
- **GameInfo.is_locked** - Prevents score changes after finalization
- **GameInfo.halftime_score & final_score** - Denormalized score cache (JSONField)

**Design Intent:** Enable workflow controls like:
- "Only publish gameday when ready" (DRAFT state)
- "Lock scores after verification" (is_locked flag)
- "Track gameday progress" (PUBLISHED → IN_PROGRESS → COMPLETED)
- Cache scores to avoid recalculating from plays

---

### Migration 0025: Designer Configuration Storage
**File:** `gamedays/migrations/0025_gameday_designer_data.py`

**Purpose:** Store gameday designer UI configuration and state.

**Changes:**
- **Gameday.designer_data** - JSONField for designer metadata

**Design Intent:**
- Store designer-specific data (field assignments, layout, formatting rules)
- "Configuration as data" pattern - no schema changes for new designer features
- Flexibility for arbitrary designer state

---

### Migration 0026: Backward Compatibility Data Fix
**File:** `gamedays/migrations/0026_set_existing_gamedays_published.py`

**Purpose:** Fix existing data to match new status semantics.

**Changes:**
- Data migration: Sets all existing gamedays to `status="PUBLISHED"`
- Reversible with rollback function

**Design Intent:**
- Migration 0024 added `status` with default="DRAFT"
- Existing production gamedays were already published and visible
- Setting them to DRAFT would incorrectly hide them
- Data migration aligns database state with reality

**Pattern:** Classic "introduce new field with existing data" - schema change (0024) and data fix (0026) are separate migrations.

---

### Migration 0027: Optional Team References
**File:** `gamedays/migrations/0027_alter_gameresult_team.py`

**Purpose:** Allow game results without team references.

**Changes:**
- **GameResult.team** - Made optional (`blank=True, null=True`)
- **on_delete** - Changed from CASCADE to PROTECT

**Design Intent:**
- Handle edge cases:
  - Placeholder teams (e.g., "TBD" or "Bye Week")
  - External/guest teams not in database
  - Data imports where team matching fails
- PROTECT prevents accidental team deletion if results exist (safer than CASCADE)

---

## The Design Problem: Status Field Divergence

### Domain Model Context

- **Gameday** = The entire event (a day with multiple games)
- **Gameinfo** = A single game within that gameday
- **Relationship:** 1 Gameday has many Gameinfo objects

### Status Systems Comparison

#### Gameday Status (Event Lifecycle)
**File:** `gamedays/models.py` lines 121-131

```python
STATUS_DRAFT = "DRAFT"
STATUS_PUBLISHED = "PUBLISHED"
STATUS_IN_PROGRESS = "IN_PROGRESS"
STATUS_COMPLETED = "COMPLETED"

STATUS_CHOICES = [
    (STATUS_DRAFT, "Draft"),
    (STATUS_PUBLISHED, "Published"),
    (STATUS_IN_PROGRESS, "In Progress"),
    (STATUS_COMPLETED, "Completed"),
]

status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
```

**Lifecycle:**
- ✅ Uses English status values
- ✅ Has proper Django `choices` constraint
- ✅ Default is `"DRAFT"`
- ✅ Well-defined state machine

**Transitions:**
1. **DRAFT** → Schedule not published yet (designer is working)
2. **PUBLISHED** → Schedule is public, games are visible
3. **IN_PROGRESS** → At least one game has started
4. **COMPLETED** → All games are finished

---

#### Gameinfo Status (Game Lifecycle)
**File:** `gamedays/models.py` lines 162-174

```python
STATUS_DRAFT = "DRAFT"          # ⚠️ Defined but NEVER used
STATUS_PUBLISHED = "Geplant"     # ⚠️ "Published" ≠ "Planned" (German)
STATUS_IN_PROGRESS = "Gestartet" # ⚠️ German for "Started"
STATUS_COMPLETED = "Beendet"     # ⚠️ German for "Ended"

# Retaining existing "Geplant" for backward compatibility if needed,
# but strictly defining new flow constants.

status = models.CharField(max_length=100, default="Geplant")  # ⚠️ No choices!
```

**Lifecycle:**
- ❌ Uses German status values (legacy system)
- ❌ Constants have misleading names (`STATUS_PUBLISHED = "Geplant"` is confusing)
- ❌ No Django `choices` constraint (accepts any string)
- ❌ Default is hardcoded `"Geplant"` (not using `STATUS_PUBLISHED`)
- ❌ `STATUS_DRAFT = "DRAFT"` defined but never used anywhere

**Transitions:**
1. **"Geplant"** (Planned) → Game is scheduled
2. **"Gestartet"** (Started) → Game has begun
3. **"Beendet"** (Ended) → Game is finished

---

### Code Examples Showing Divergence

#### Example 1: Redundant Check (Line 584)
**File:** `gamedays/api/views.py:584`

```python
if game.status == Gameinfo.STATUS_PUBLISHED or game.status == "Geplant":
    game.status = Gameinfo.STATUS_IN_PROGRESS
```

**Problem:** This is redundant because:
- `Gameinfo.STATUS_PUBLISHED` equals `"Geplant"`
- The condition checks the same thing twice: `"Geplant" or "Geplant"`
- Reveals developer confusion: they don't trust the constants

---

#### Example 2: Misleading Constant Usage (Lines 224, 513)
**File:** `gamedays/api/views.py:224, 513`

```python
gameinfo_defaults = {
    "status": Gameinfo.STATUS_PUBLISHED,  # Sets "Geplant"
    # ... other fields
}
```

**Problem:** When you **publish a Gameday**, it sets each **Gameinfo** status to `STATUS_PUBLISHED` (which equals `"Geplant"`).

**Semantic Issue:**
- Publishing the **gameday** means making the schedule public
- But this sets each **game** status to `STATUS_PUBLISHED` = `"Geplant"` = "Planned"
- "Publishing" a gameday doesn't "publish" individual games - it marks them as "planned/scheduled"
- The constant name is semantically incorrect for what's actually happening

---

#### Example 3: Mixed Systems in Tests
**File:** `gamedays/api/tests/test_gameday_publish.py`

```python
# Ensure initial state is "Geplant" for the test
Gameinfo.objects.filter(gameday=gameday).update(status="Geplant")

# Verify all games are also in DRAFT (default "Geplant" in model)
for game in games:
    assert game.status == "Geplant"
```

Tests use hardcoded German strings instead of constants, showing the system is not consistently used.

---

### Impact Analysis

1. **Language Inconsistency**
   - Parent (Gameday): English
   - Child (Gameinfo): German
   - No clear reason for the difference

2. **Misleading Constant Names**
   - `Gameinfo.STATUS_PUBLISHED = "Geplant"`
   - "Published" and "Planned" are semantically different concepts
   - Developers can't trust the constant names

3. **No Database Constraints**
   - Gameday: Has `choices` constraint (only allows valid statuses)
   - Gameinfo: No constraint (can be set to any string)
   - Risk of typos and invalid states

4. **Unused Constants**
   - `Gameinfo.STATUS_DRAFT = "DRAFT"` defined but never used
   - Dead code that adds confusion

5. **Codebase Confusion**
   - Some code uses constants: `Gameinfo.STATUS_PUBLISHED`
   - Some uses hardcoded strings: `"Geplant"`
   - Some uses both (redundant checks)

6. **Testing Inconsistency**
   - Tests use hardcoded German strings
   - Production code mixes constants and strings
   - No single source of truth

---

## Root Cause Analysis

### Historical Context

Looking at `gamedays/migrations/0005_auto_20210320_1503.py`:
```python
field=models.CharField(default="Geplant", max_length=100),
```

The German status system predates the English system by years (2021 vs 2026).

### What Happened

1. **Original System (2021):** Gameinfo used German statuses ("Geplant", "Gestartet", "Beendet")
2. **Migration 0024 (2026):** Added status to Gameday with new English system
3. **Incomplete Migration:** Gameinfo was not updated to match
4. **Band-Aid Solution:** Added English constant names that map to German values
5. **Result:** Two diverging systems with confusing semantics

---

## Recommendations

### Option 1: Align Gameinfo with Gameday (Recommended)

**Goal:** Use consistent English status system across both models.

**Steps:**
1. Create migration to add `choices` constraint to `Gameinfo.status`
2. Data migration to translate:
   - `"Geplant"` → `"SCHEDULED"` (not "PUBLISHED"!)
   - `"Gestartet"` → `"STARTED"`
   - `"Beendet"` → `"FINISHED"`
3. Update constants:
   ```python
   # Gameinfo - Game lifecycle
   STATUS_SCHEDULED = "SCHEDULED"  # Not "PUBLISHED"
   STATUS_STARTED = "STARTED"
   STATUS_IN_PROGRESS = "STARTED"  # Alias for compatibility
   STATUS_FINISHED = "FINISHED"
   STATUS_COMPLETED = "FINISHED"   # Alias for compatibility
   ```
4. Update all code to use new constants
5. Remove redundant checks (line 584)
6. Update tests to use constants instead of hardcoded strings

**Benefits:**
- Consistent language across models
- Semantically correct constant names
- Database constraints prevent invalid states
- Single source of truth
- Easier for new developers to understand

**Risks:**
- Requires data migration
- Could affect external integrations that expect German values
- Need to verify all API consumers

---

### Option 2: Keep German for Gameinfo

**Goal:** Embrace the German system but fix the constant names.

**Steps:**
1. Rename constants to match reality:
   ```python
   STATUS_GEPLANT = "Geplant"    # Not STATUS_PUBLISHED
   STATUS_GESTARTET = "Gestartet"
   STATUS_BEENDET = "Beendet"
   ```
2. Add `choices` constraint:
   ```python
   GAMEINFO_STATUS_CHOICES = [
       (STATUS_GEPLANT, "Geplant"),
       (STATUS_GESTARTET, "Gestartet"),
       (STATUS_BEENDET, "Beendet"),
   ]
   status = models.CharField(max_length=100, choices=GAMEINFO_STATUS_CHOICES, default=STATUS_GEPLANT)
   ```
3. Update all code to use correct constant names
4. Document why Gameday uses English but Gameinfo uses German

**Benefits:**
- No data migration needed
- No risk to external integrations
- Fixes misleading names

**Drawbacks:**
- Language inconsistency persists
- Doesn't solve the fundamental design divergence

---

### Option 3: Create Translation/Mapping Layer

**Goal:** Keep both systems but add explicit translation.

**Steps:**
1. Create status translation service:
   ```python
   class GameStatusMapper:
       GAMEINFO_TO_ENGLISH = {
           "Geplant": "SCHEDULED",
           "Gestartet": "STARTED",
           "Beendet": "FINISHED",
       }

       @classmethod
       def to_english(cls, german_status):
           return cls.GAMEINFO_TO_ENGLISH.get(german_status, german_status)
   ```
2. Use in serializers/API layer
3. Keep German in database for compatibility
4. Eventually migrate data and remove translation layer

**Benefits:**
- Gradual migration path
- No breaking changes
- API can return English while DB stays German

**Drawbacks:**
- Adds complexity
- Translation layer is technical debt
- Still have two systems

---

## Recommended Implementation Plan

**Phase 1: Immediate Fixes (No Migration)**
1. Rename constants to match reality:
   - `STATUS_GEPLANT` instead of `STATUS_PUBLISHED`
   - Document the divergence
2. Remove redundant checks (line 584)
3. Use constants consistently throughout codebase
4. Update tests to use constants

**Phase 2: Add Constraints (Migration Required)**
1. Add `choices` to `Gameinfo.status` field
2. Validate existing data before adding constraint

**Phase 3: Long-Term Alignment (Future Work)**
1. Decide on English standardization
2. Create data migration strategy
3. Update API contracts
4. Coordinate with frontend/consumers
5. Migrate data
6. Remove German status values

---

## Files Requiring Changes

### Models
- `gamedays/models.py` - Update Gameinfo constants and add choices

### API Views
- `gamedays/api/views.py` - Fix redundant checks, use correct constants

### Tests
- `gamedays/api/tests/test_gameday_publish.py` - Use constants instead of strings
- `gamedays/tests/api/test_views.py` - Update assertions
- `liveticker/tests/api/test_views.py` - Update test data
- `liveticker/tests/api/test_serializers.py` - Update test data
- `liveticker/tests/service/test_liveticker_service.py` - Update assertions

### Forms
- `gamedays/forms.py:359-362` - Update status choices

### Services
- `gameday_designer/service/template_application_service.py` - Use constants

### Test Factories
- `gamedays/tests/setup_factories/db_setup.py` - Use constants

---

## Questions for Decision

1. **Do we need to maintain German status values for external integrations?**
   - If yes → Use Option 3 (translation layer)
   - If no → Use Option 1 (full English migration)

2. **Is there a product/user-facing reason Gameinfo uses German?**
   - Are German users expecting German status values?
   - Are these statuses displayed in UI?

3. **Should we align status semantics?**
   - Currently: Gameday "PUBLISHED" vs Gameinfo "Geplant" (Planned)
   - Should Gameinfo use "SCHEDULED" to avoid confusion with Gameday "PUBLISHED"?

4. **Timeline for migration?**
   - Immediate fix (rename constants, add constraints)
   - Or full migration in next major version?

---

## Conclusion

Migration 0024 successfully added lifecycle management to Gamedays but left Gameinfo with a legacy German status system. This creates:
- **Technical confusion:** Misleading constant names, redundant code
- **Maintenance burden:** Two systems to understand and maintain
- **Data integrity risk:** No constraints on Gameinfo status

**Recommended Approach:** Phase 1 immediate fixes (rename constants, add constraints), then plan Phase 3 full migration to English for long-term alignment.

The divergence is fixable but requires careful planning to avoid breaking external dependencies.
