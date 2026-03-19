# Finance Admin Access Control — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Restrict the finance feature to staff users whose email ends with `@bumbleflies.de`. Non-qualifying users see no finance menu entry and are redirected to home if they access finance URLs directly.

## Context

The finance feature lives in the `feat-league-finances` worktree (`finance/`). Access is currently controlled by `is_staff` checks in two places:

- `finance/menu.py` — controls menu visibility
- `finance/views.py` — `StaffRequiredMixin` gates all finance views

## Design

### 1. Helper Function

Add `is_finance_admin(user)` to `league_manager/utils/view_utils.py` (alongside the existing `PermissionHelper` class):

```python
def is_finance_admin(user):
    return user.is_staff and user.email.endswith('@bumbleflies.de')
```

Single source of truth. Both the menu and the view mixin call this function.

### 2. Menu Visibility (`finance/menu.py`)

Replace `request.user.is_staff` with `is_finance_admin(request.user)`. Users who do not satisfy both conditions see no Finance entry in the navigation.

### 3. View Protection (`finance/views.py`)

Update `StaffRequiredMixin`:

- `test_func` calls `is_finance_admin(self.request.user)`
- Override `handle_no_permission` to `redirect('/')` — ensures the feature appears non-existent to unauthorized users (no 403, no login redirect)

### 4. Tests

**Unit tests** — `league_manager/tests/utils/test_view_utils.py`:
- `is_finance_admin` returns `True` for staff with `@bumbleflies.de` email
- `is_finance_admin` returns `False` for staff with other email
- `is_finance_admin` returns `False` for non-staff with `@bumbleflies.de` email

**Integration tests** — extend existing finance tests:
- Finance menu is hidden for non-bumbleflies staff
- Finance views redirect to `/` for non-bumbleflies staff
- Finance views redirect to `/` for non-staff

## Files Changed

| File | Change |
|---|---|
| `league_manager/utils/view_utils.py` | Add `is_finance_admin(user)` function |
| `finance/menu.py` | Use `is_finance_admin` instead of `is_staff` |
| `finance/views.py` | Update `StaffRequiredMixin` to use `is_finance_admin` and override `handle_no_permission` |
| `league_manager/tests/utils/test_view_utils.py` | Add unit tests for `is_finance_admin` |
| `finance/tests.py` | Add integration tests for menu and view access |

## Constraints

- No new migrations required
- No Django groups or permissions model changes
- Domain string (`@bumbleflies.de`) lives only in `is_finance_admin` — one place to change if it ever needs updating
