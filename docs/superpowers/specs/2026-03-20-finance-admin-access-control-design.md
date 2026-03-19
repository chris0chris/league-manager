# Finance Admin Access Control — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Restrict the finance feature to staff users whose email ends with `@bumbleflies.de`. All other users — whether unauthenticated, non-staff, or staff with a different email — see no finance menu entry and are redirected to `/` if they access finance URLs directly.

## Context

The finance feature lives in the `feat-league-finances` worktree (`finance/`). Access is currently controlled by `is_staff` checks in two places:

- `finance/menu.py` — controls menu visibility
- `finance/views.py` — `StaffRequiredMixin` gates all finance views

## Design

### 1. Helper Function

Add `is_finance_admin(user)` to `league_manager/utils/view_utils.py` (alongside the existing `PermissionHelper` class):

```python
def is_finance_admin(user):
    return user.is_staff and (user.email or '').endswith('@bumbleflies.de')
```

The `(user.email or '')` guard handles the edge case of a `None` email field. `AnonymousUser.is_staff` is `False`, so the email check short-circuits and is never reached for unauthenticated users — the function is safe to call with any user object.

This is the single source of truth. Both the menu and the view mixin call this function.

### 2. Menu Visibility (`finance/menu.py`)

Replace `request.user.is_staff` with `is_finance_admin(request.user)`. Users who do not satisfy both conditions see no Finance entry in the navigation.

### 3. View Protection (`finance/views.py`)

Update `StaffRequiredMixin` and remove `LoginRequiredMixin` from all six concrete view classes. Unauthenticated users must be redirected to `/` (not `/login/`), consistent with the "feature does not exist" behaviour. `handle_no_permission` in `StaffRequiredMixin` covers the unauthenticated case, so `LoginRequiredMixin` is no longer needed.

The six classes that each carry `LoginRequiredMixin` and must have it removed:
- `FinanceDashboardView`
- `ConfigCreateView`
- `ConfigDeleteView`
- `FinanceConfigDetailView`
- `DiscountDeleteView`
- `GlobalSettingsUpdateView`

Updated `StaffRequiredMixin` (note: `redirect` is already imported in `views.py`; `raise_exception` must remain at its default value of `False` — do not set it to `True` on any finance view):

```python
class StaffRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return is_finance_admin(self.request.user)

    def handle_no_permission(self):
        return redirect('/')
```

The home view at `path("", homeview)` has no named URL in this project, so `redirect('/')` is used intentionally.

### 4. Tests

**Unit tests** — `league_manager/tests/utils/test_view_utils.py`:
- `is_finance_admin` returns `True` for staff with `@bumbleflies.de` email
- `is_finance_admin` returns `False` for staff with a non-bumbleflies email
- `is_finance_admin` returns `False` for staff with a subdomain email (`user@sub.bumbleflies.de`) — confirms `endswith` is anchored at `@`
- `is_finance_admin` returns `False` for non-staff with `@bumbleflies.de` email
- `is_finance_admin` returns `False` for `AnonymousUser`
- `is_finance_admin` returns `False` for staff with `email=None`

**Integration tests** — `finance/tests.py` (add a new `FinanceAccessControlTest` class to the existing file):

All test requests use `self.client.get(url)` without `follow=True`; use `assertRedirects(response, '/', fetch_redirect_response=False)` to check the redirect target without issuing a secondary GET.

Menu visibility:
- Finance menu IS visible for staff with `@bumbleflies.de` email
- Finance menu is hidden for non-bumbleflies staff
- Finance menu is hidden for unauthenticated users

View access:
- Finance views are accessible (200) for staff with `@bumbleflies.de` email
- Finance views redirect to `/` for non-bumbleflies staff: `assertRedirects(response, '/', fetch_redirect_response=False)`
- Finance views redirect to `/` for non-staff: `assertRedirects(response, '/', fetch_redirect_response=False)`
- Finance views redirect to `/` for unauthenticated users: `assertRedirects(response, '/', fetch_redirect_response=False)`

## Files Changed

| File | Change |
|---|---|
| `league_manager/utils/view_utils.py` | Add `is_finance_admin(user)` function |
| `finance/menu.py` | Use `is_finance_admin` instead of `is_staff` |
| `finance/views.py` | Update `StaffRequiredMixin` (use `is_finance_admin`, add `handle_no_permission`); remove `LoginRequiredMixin` from all 6 view classes |
| `league_manager/tests/utils/test_view_utils.py` | Add unit tests for `is_finance_admin` |
| `finance/tests.py` | Add `FinanceAccessControlTest` class with integration tests |

## Constraints

- No new migrations required
- No Django groups or permissions model changes
- Domain string (`@bumbleflies.de`) lives only in `is_finance_admin` — one place to change if it ever needs updating
- Home URL has no Django name in this project; `redirect('/')` is intentional
- `raise_exception` must remain `False` (default) on all finance views
