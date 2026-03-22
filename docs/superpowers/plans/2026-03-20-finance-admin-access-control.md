# Finance Admin Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict the finance feature to staff users with a `@bumbleflies.de` email; all other users see no menu entry and are redirected to `/`.

**Architecture:** Add a single `is_finance_admin(user)` helper to `league_manager/utils/view_utils.py`. The finance menu and view mixin both call this helper — one source of truth. `StaffRequiredMixin` gets `handle_no_permission` overridden to `redirect('/')`, and `LoginRequiredMixin` is removed from all six finance view classes so unauthenticated users also land on `/` rather than the login page.

**Tech Stack:** Python 3, Django, pytest, Django test client (`django.test.TestCase`)

**Worktree:** All changes are in `.worktrees/feat-league-finances/` — run all commands from that directory.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `league_manager/utils/view_utils.py` | Modify | Add `is_finance_admin(user)` function |
| `league_manager/tests/utils/test_view_utils.py` | Modify | Add `IsFinanceAdminTests` test class |
| `finance/menu.py` | Modify | Use `is_finance_admin` instead of `is_staff` |
| `finance/views.py` | Modify | Update `StaffRequiredMixin`; remove `LoginRequiredMixin` from 6 views |
| `finance/tests.py` | Modify | Add `FinanceAccessControlTest` class |

---

## Task 1: Add `is_finance_admin` helper with unit tests

**Files:**
- Modify: `league_manager/utils/view_utils.py`
- Test: `league_manager/tests/utils/test_view_utils.py`

- [ ] **Step 1: Write the failing tests**

Open `league_manager/tests/utils/test_view_utils.py` and add this class after the existing `PermissionHelperTests`:

```python
from django.contrib.auth.models import AnonymousUser, User
from league_manager.utils.view_utils import PermissionHelper, is_finance_admin


class IsFinanceAdminTests(TestCase):
    def _make_staff(self, email):
        user = MagicMock(is_staff=True, email=email)
        return user

    def test_staff_with_bumbleflies_email_is_finance_admin(self):
        user = self._make_staff('admin@bumbleflies.de')
        self.assertTrue(is_finance_admin(user))

    def test_staff_with_other_email_is_not_finance_admin(self):
        user = self._make_staff('admin@other.de')
        self.assertFalse(is_finance_admin(user))

    def test_staff_with_subdomain_email_is_not_finance_admin(self):
        # user@sub.bumbleflies.de ends with '.bumbleflies.de', not '@bumbleflies.de'
        user = self._make_staff('admin@sub.bumbleflies.de')
        self.assertFalse(is_finance_admin(user))

    def test_non_staff_with_bumbleflies_email_is_not_finance_admin(self):
        user = MagicMock(is_staff=False, email='user@bumbleflies.de')
        self.assertFalse(is_finance_admin(user))

    def test_anonymous_user_is_not_finance_admin(self):
        self.assertFalse(is_finance_admin(AnonymousUser()))

    def test_staff_with_none_email_is_not_finance_admin(self):
        user = self._make_staff(None)
        self.assertFalse(is_finance_admin(user))
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd .worktrees/feat-league-finances
pytest league_manager/tests/utils/test_view_utils.py::IsFinanceAdminTests -v
```

Expected: ImportError or NameError — `is_finance_admin` does not exist yet.

- [ ] **Step 3: Add `is_finance_admin` to `view_utils.py`**

Open `league_manager/utils/view_utils.py` and append after the `PermissionHelper` class:

```python
def is_finance_admin(user):
    return user.is_staff and (user.email or '').endswith('@bumbleflies.de')
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest league_manager/tests/utils/test_view_utils.py::IsFinanceAdminTests -v
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add league_manager/utils/view_utils.py league_manager/tests/utils/test_view_utils.py
git commit -m "feat: add is_finance_admin helper with unit tests"
```

---

## Task 2: Restrict finance menu visibility

**Files:**
- Modify: `finance/menu.py`

- [ ] **Step 1: Update `finance/menu.py`**

The current file checks `request.user.is_staff`. Replace it with `is_finance_admin`:

```python
from league_manager.base_menu import BaseMenu, MenuItem
from league_manager.utils.view_utils import is_finance_admin


class FinanceMenu(BaseMenu):
    def get_name(self):
        return "Finance"

    def get_menu_items(self, request):
        if not is_finance_admin(request.user):
            return []

        return [
            MenuItem.create("Dashboard", "finance-dashboard"),
        ]
```

- [ ] **Step 2: Verify no existing tests break**

```bash
pytest finance/ -v
```

Expected: all existing tests PASS.

- [ ] **Step 3: Commit**

```bash
git add finance/menu.py
git commit -m "feat: restrict finance menu to bumbleflies.de admins"
```

---

## Task 3: Restrict finance views and add integration tests

**Files:**
- Modify: `finance/views.py`
- Modify: `finance/tests.py`

### 3a — Write failing integration tests first

- [ ] **Step 1: Write the failing integration tests**

Open `finance/tests.py` and add this class at the bottom (after the existing `FinanceServiceTest`):

```python
from django.test import TestCase, Client
from django.contrib.auth.models import User


class FinanceAccessControlTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.finance_url = '/finance/'  # dashboard URL

        self.bumbleflies_staff = User.objects.create_user(
            username='bf_admin', email='admin@bumbleflies.de', password='pass'
        )
        self.bumbleflies_staff.is_staff = True
        self.bumbleflies_staff.save()

        self.other_staff = User.objects.create_user(
            username='other_admin', email='admin@other.de', password='pass'
        )
        self.other_staff.is_staff = True
        self.other_staff.save()

        self.regular_user = User.objects.create_user(
            username='regular', email='user@bumbleflies.de', password='pass'
        )

    def test_bumbleflies_staff_can_access_finance(self):
        self.client.login(username='bf_admin', password='pass')
        response = self.client.get(self.finance_url)
        self.assertEqual(response.status_code, 200)

    def test_other_staff_redirected_to_home(self):
        self.client.login(username='other_admin', password='pass')
        response = self.client.get(self.finance_url)
        self.assertRedirects(response, '/', fetch_redirect_response=False)

    def test_non_staff_redirected_to_home(self):
        self.client.login(username='regular', password='pass')
        response = self.client.get(self.finance_url)
        self.assertRedirects(response, '/', fetch_redirect_response=False)

    def test_unauthenticated_redirected_to_home(self):
        response = self.client.get(self.finance_url)
        self.assertRedirects(response, '/', fetch_redirect_response=False)

    def test_bumbleflies_staff_sees_finance_menu(self):
        self.client.login(username='bf_admin', password='pass')
        response = self.client.get('/')
        menu_items = [
            item
            for group in response.context.get('menu', [])
            for item in group.get('items', [])
        ]
        names = [item['name'] for item in menu_items]
        self.assertIn('Finance', names)

    def test_other_staff_does_not_see_finance_menu(self):
        self.client.login(username='other_admin', password='pass')
        response = self.client.get('/')
        menu_items = [
            item
            for group in response.context.get('menu', [])
            for item in group.get('items', [])
        ]
        names = [item['name'] for item in menu_items]
        self.assertNotIn('Finance', names)

    def test_unauthenticated_does_not_see_finance_menu(self):
        response = self.client.get('/')
        menu_items = [
            item
            for group in response.context.get('menu', [])
            for item in group.get('items', [])
        ]
        names = [item['name'] for item in menu_items]
        self.assertNotIn('Finance', names)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest finance/tests.py::FinanceAccessControlTest -v
```

Expected: `test_other_staff_redirected_to_home`, `test_non_staff_redirected_to_home`, and `test_unauthenticated_redirected_to_home` FAIL (currently they redirect to `/login/` or return 403, not `/`). `test_bumbleflies_staff_can_access_finance` may also fail if the email restriction is not yet in place.

### 3b — Update views

- [ ] **Step 3: Update `finance/views.py`**

Make two changes:

**a) Update `StaffRequiredMixin`** (at the top of the file, before the view classes):

```python
from league_manager.utils.view_utils import is_finance_admin

class StaffRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return is_finance_admin(self.request.user)

    def handle_no_permission(self):
        return redirect('/')
```

Add `redirect` to the existing import: `from django.shortcuts import render, get_object_or_404, redirect` (it's already there).

**b) Remove `LoginRequiredMixin` from all 6 view class definitions:**

```python
class FinanceDashboardView(StaffRequiredMixin, ListView):      # was: LoginRequiredMixin, StaffRequiredMixin, ListView
class ConfigCreateView(StaffRequiredMixin, CreateView):        # was: LoginRequiredMixin, StaffRequiredMixin, CreateView
class ConfigDeleteView(StaffRequiredMixin, DeleteView):        # was: LoginRequiredMixin, StaffRequiredMixin, DeleteView
class FinanceConfigDetailView(StaffRequiredMixin, DetailView): # was: LoginRequiredMixin, StaffRequiredMixin, DetailView
class DiscountDeleteView(StaffRequiredMixin, DeleteView):      # was: LoginRequiredMixin, StaffRequiredMixin, DeleteView
class GlobalSettingsUpdateView(StaffRequiredMixin, UpdateView):# was: LoginRequiredMixin, StaffRequiredMixin, UpdateView
```

Also remove the `LoginRequiredMixin` import if it is no longer used elsewhere in the file:
```python
from django.contrib.auth.mixins import UserPassesTestMixin  # remove LoginRequiredMixin
```

- [ ] **Step 4: Run integration tests to verify they pass**

```bash
pytest finance/tests.py::FinanceAccessControlTest -v
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full finance test suite to check nothing broke**

```bash
pytest finance/ -v
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add finance/views.py finance/tests.py
git commit -m "feat: restrict finance views to bumbleflies.de admins, redirect others to home"
```

---

## Task 4: Full regression check

- [ ] **Step 1: Run the full backend test suite**

```bash
pytest --tb=short
```

Expected: all tests PASS. If anything fails outside `finance/` or `league_manager/`, investigate before proceeding.

- [ ] **Step 2: Run linting**

```bash
black --check .
```

Fix any issues with `black .` then re-check.

- [ ] **Step 3: Final commit if lint fixes were needed**

```bash
git add -u
git commit -m "style: apply black formatting"
```
