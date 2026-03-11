# Code Review: PR #944 — Dual Tournament Progression and Centralized Placeholder Resolution

- **PR**: https://github.com/dachrisch/leaguesphere/pull/944
- **Author**: @dachrisch
- **Branch**: `feature/dual-progression` -> `master`
- **CI**: All checks passing (CircleCI + CodeQL)
- **Stats**: +710 / -53 across 15 files

## Summary

This PR introduces a dual-path tournament progression system: a new DB-template-driven path
for Gameday Designer gamedays, alongside the existing JSON-based legacy path. It also
centralizes "placeholder" team name resolution (e.g., "Winner Game 1") into a single
`GamedayPlaceholderService` used across multiple serializers and services.

The design is sound and the router pattern in `signals.py` is clean. However, several issues
were identified ranging from a critical bug to architectural concerns.

---

## Critical Issues

### 1. Status case mismatch will prevent Designer path from ever triggering

**File**: `gamedays/service/signals.py`

The signal checks `instance.status == FINISHED` where `FINISHED = "beendet"` (lowercase).
However, `GameResultsUpdateSerializer` sets `instance.status = Gameinfo.STATUS_COMPLETED`
which is `"Beendet"` (capital B) — see `gamedays/serializers/game_results.py:44`.

This is a pre-existing issue — the signal has always checked for lowercase `"beendet"` while
the model constant is `"Beendet"`. The tests use lowercase `"beendet"` directly (bypassing the
serializer), so they pass. If the actual API flow uses the serializer (capital B), the signal
never fires at all.

**Recommendation**: Verify in production which casing is actually used. If the signal does work
in production today, then the API likely uses lowercase somewhere. But this warrants
investigation — if the signal never fires, the entire legacy path has also been broken.

### 2. `_create_gameresults` now creates Gameresult with `team=None` — potential cascading effects

**File**: `gameday_designer/service/template_application_service.py`

The PR removes the `if home_team:` / `if away_team:` guards, meaning `Gameresult` rows are now
always created, even with `team=None`. While `Gameresult.team` is nullable (`null=True`), this
is a behavioral change that affects the entire system:

- `GamedayModelWrapper.__init__` does a left join of gameinfo to gameresult. Previously, future
  bracket games might have 0 gameresults. Now they'll have 2 rows with NaN team fields.
- Any code that checks `len(self.gameresult)` (like `GamedayGameService.__init__`) will now
  enter the team-assignment branch for games that previously had no results, hitting the new
  placeholder logic.

This is likely intentional (the placeholder service needs these rows to exist), but verify that
no other code assumes "no Gameresult = game not yet scheduled" or that
`Gameresult.objects.filter(team__isnull=False)` queries exist elsewhere.

---

## High-Priority Issues

### 3. N+1 query problem in `_resolve_placeholders`

**File**: `gamedays/service/model_wrapper.py`

```python
for index, row in self._games_with_result[...].iterrows():
    placeholder = placeholder_service.get_placeholder(
        row[GAMEINFO_ID], is_home=row[IS_HOME]
    )
```

Each call to `get_placeholder` executes a `Gameinfo.objects.get()` query plus
`Gameinfo.objects.filter().count()` plus `TemplateSlot.objects.filter().order_by()` — that's
3 DB queries per missing team. For a 6-team gameday with 4 bracket games (8 null teams), this
is 24+ extra queries on every `GamedayModelWrapper` construction.

**Recommendation**: Prefetch all gameinfos for the gameday and all slots for the template in
`GamedayPlaceholderService.__init__`, then resolve in-memory.

### 4. Inline imports scattered throughout

**Files**: `gamedays/api/serializers.py`, `gamedays/serializers/game_results.py`,
`gamedays/service/gameday_service.py`, `gamedays/service/model_wrapper.py`,
`passcheck/api/serializers.py`

There are 6+ inline `from gamedays.service.placeholder_service import
GamedayPlaceholderService` imports inside methods. While this avoids circular imports, it
suggests the dependency graph has a structural issue. The `placeholder_service` imports from
`gameday_designer.models`, creating a cross-app dependency (`gamedays` -> `gameday_designer`).

**Recommendation**: Consider whether `GamedayPlaceholderService` belongs in
`gameday_designer/service/` instead, or restructure so `gamedays` doesn't depend on designer
models. At minimum, add a comment at each inline import explaining why it can't be at module
level.

### 5. Fragile slot-matching heuristic in `_find_slot_for_game`

**File**: `gamedays/service/placeholder_service.py`

```python
game_index = Gameinfo.objects.filter(
    gameday_id=self.gameday_id,
    field=gi.field,
    scheduled__lte=gi.scheduled
).count()
```

This matches games to template slots by counting how many games exist on the same field with
`scheduled <= this_game.scheduled`. This assumes:

- No two games on the same field have the same scheduled time (ties break unpredictably)
- Games are inserted in the same order as template slots
- No games are ever deleted/re-added

If any of these assumptions break, the wrong slot is matched, producing wrong placeholder names
silently.

**Recommendation**: Store the `TemplateSlot` FK directly on `Gameinfo` or `Gameresult` during
template application (in `_create_gameresults`), rather than reverse-engineering the mapping at
read time.

### 6. Bare `except Exception` swallowing errors

**File**: `gamedays/service/placeholder_service.py`,
`gamedays/service/schedule_resolution_service.py`

```python
except Exception as e:
    logger.debug(f"Placeholder resolution failed...")  # debug level!
    return "TBD"
```

All failures in placeholder resolution are caught, logged at `DEBUG` level, and silently return
"TBD". This makes debugging production issues very difficult — a broken template mapping would
never surface.

**Recommendation**: Use `logger.warning` at minimum, and consider letting specific expected
exceptions (like `DoesNotExist`) return "TBD" while re-raising unexpected ones.

---

## Medium-Priority Issues

### 7. `get_staff_passcheck_details` repositioned in class

**File**: `gamedays/service/model_wrapper.py`

The method was moved from the bottom of `GamedayModelWrapper` to right after
`_resolve_placeholders`. The move itself is fine, but the new location inside the class is
placed between an init-time helper and a query method, which doesn't match the class's
organizational pattern.

### 8. `GamedayGameService.__init__` — potential IndexError on `.iloc[0]`

**File**: `gamedays/service/gameday_service.py`

The new code explicitly filters by `isHome == True/False` (an improvement over positional
indexing), but `self.gameresult[self.gameresult['isHome'] == True]` may return an empty
DataFrame if only one Gameresult exists. The `.iloc[0]` would then raise `IndexError`.

**Recommendation**: Add a guard: `if not home_rows.empty:` before accessing `.iloc[0]`.

### 9. `_apply_rule` matches by field+stage+standing, not slot_order

**File**: `gamedays/service/schedule_resolution_service.py`

```python
target_gi = Gameinfo.objects.filter(
    gameday=self.gameday,
    field=rule.slot.field,
    stage=rule.slot.stage,
    standing=rule.slot.standing
).first()
```

If two games share the same `field`, `stage`, and `standing` (common in group play), `.first()`
returns an arbitrary one. This should use the same slot-matching logic as the placeholder
service, or better yet, a stored FK.

### 10. Test assertions use magic values without explaining derivation

**File**: `gamedays/tests/api/test_scorecard_placeholder.py`

```python
assert data['home']['name'] == "Winner Game 3"
```

The comment acknowledges the value is derived from the `DBSetup` fixture, but the test depends
on `g62_status_empty()` creating exactly N games on field 1 before this one. If `DBSetup`
changes, this test silently breaks. The `test_placeholder_resolution.py` handles this better by
clearing all games first.

---

## Low-Priority / Nits

### 11. Passcheck `id` field falsy check

**File**: `passcheck/api/serializers.py`

The `id` is added to `ALL_FIELD_VALUES` and as a field, but `get_home`/`get_away` use
`obj.get('id')` with a falsy check. If `id` is 0 (unlikely but possible), placeholder
resolution would be skipped.

### 12. Template fallback by format name

**File**: `gamedays/service/placeholder_service.py`

```python
template_name = f"schedule_{self.gameday.format}"
self._template = ScheduleTemplate.objects.filter(name=template_name).first()
```

This fallback assumes a naming convention (`schedule_6_2`, etc.) that isn't enforced. If this
convention doesn't hold, it silently returns `None` and all placeholders become "TBD".

### 13. Documentation files

Two doc files are added (`docs/features/` and `docs/plans/`). The plan document
(`docs/plans/2026-03-11-dual-progression-logic.md`) contains the pre-implementation design —
consider removing it or moving to a separate commit, as it duplicates the feature doc and may
go stale.

### 14. Missing newline at EOF was fixed

**File**: `gamedays/service/model_wrapper.py` — the old file was missing a trailing newline.
Fixed in this PR. Good.

---

## What's Done Well

- **Clean router pattern** in `signals.py` — the dual-path switching is minimal and easy to
  understand.
- **Comprehensive test coverage** for the new logic paths (signal switching, placeholder
  resolution, scorecard API).
- **Backward compatibility** — legacy gamedays are untouched.
- **`GameResultSerializer` refactor** from `source="team.name"` to `SerializerMethodField`
  correctly handles the `None` team case.
- **Excellent documentation** with Mermaid diagrams in the feature doc.

---

## Fix PRs

The following fix PRs have been created, all targeting `feature/dual-progression`:

| Finding | Severity | Fix PR | Branch | Status |
|---------|----------|--------|--------|--------|
| #1 Status case mismatch | Critical | [#945](https://github.com/dachrisch/leaguesphere/pull/945) | `fix/status-case-mismatch` | Open |
| #3 N+1 query in placeholder resolution | High | [#950](https://github.com/dachrisch/leaguesphere/pull/950) | `fix/placeholder-n-plus-1` | Open |
| #4 Inline imports | Low | [#951](https://github.com/dachrisch/leaguesphere/pull/951) | `fix/inline-imports` | Open |
| #5 Fragile slot matching | High | Deferred | — | Requires DB migration; tracked separately |
| #6 Bare except Exception | Medium | [#946](https://github.com/dachrisch/leaguesphere/pull/946) | `fix/bare-except-narrowing` | Open |
| #8 IndexError guard | Medium | [#947](https://github.com/dachrisch/leaguesphere/pull/947) | `fix/indexerror-guard` | Open |
| #9 Ambiguous _apply_rule matching | High | [#949](https://github.com/dachrisch/leaguesphere/pull/949) | `fix/apply-rule-ambiguity` | Open |
| #10 Test magic values | Low | [#952](https://github.com/dachrisch/leaguesphere/pull/952) | `fix/test-magic-values` | Open |
| #11 Passcheck falsy check | Low | [#948](https://github.com/dachrisch/leaguesphere/pull/948) | `fix/passcheck-falsy-check` | Open |
| #12 Template fallback logging | Low | [#953](https://github.com/dachrisch/leaguesphere/pull/953) | `fix/template-fallback-logging` | Open |

Findings #2 (behavioral change in `_create_gameresults`), #7 (method repositioning), #13
(docs cleanup), and #14 (EOF newline) do not require code fixes.

---

## Recommended Actions Before Merge

| Priority | Action |
|----------|--------|
| Critical | Investigate `"beendet"` vs `"Beendet"` status casing to confirm signal fires in production |
| High | Add `IndexError` guards in `GamedayGameService.__init__` for `.iloc[0]` calls |
| High | Consider storing `TemplateSlot` FK on `Gameinfo`/`Gameresult` to avoid fragile index-based matching |
| Medium | Upgrade `except Exception` handlers from `logger.debug` to `logger.warning` |
| Medium | Address N+1 queries in `_resolve_placeholders` with prefetching |
| Low | Clean up or remove `docs/plans/` design doc |
