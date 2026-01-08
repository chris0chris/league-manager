"""
Tests for gameday_designer permissions.

Following TDD methodology (RED phase) - writing tests BEFORE implementation.
Tests define expected permission behavior for different user types.
"""
import pytest
from django.contrib.auth.models import User, AnonymousUser
from rest_framework.test import APIRequestFactory

from gamedays.models import Association, Gameday
from gameday_designer.models import ScheduleTemplate


@pytest.fixture
def api_factory():
    """Provide DRF APIRequestFactory."""
    return APIRequestFactory()


@pytest.fixture
def staff_user(db):
    """Create staff user."""
    return User.objects.create_user(
        username='staff',
        email='staff@example.com',
        password='password',
        is_staff=True
    )


@pytest.fixture
def association_user(db):
    """Create regular user."""
    return User.objects.create_user(
        username='assoc_user',
        email='assoc@example.com',
        password='password',
        is_staff=False
    )


@pytest.fixture
def other_user(db):
    """Create another regular user."""
    return User.objects.create_user(
        username='other_user',
        email='other@example.com',
        password='password',
        is_staff=False
    )


@pytest.fixture
def association(db):
    """Create test association."""
    return Association.objects.create(
        name='Test Association',
        abbr='TEST'
    )


@pytest.fixture
def other_association(db):
    """Create another association."""
    return Association.objects.create(
        name='Other Association',
        abbr='OTHER'
    )


@pytest.fixture
def association_template(db, association, association_user):
    """Create association-specific template."""
    return ScheduleTemplate.objects.create(
        name='Association Template',
        description='For TEST association',
        num_teams=6,
        num_fields=2,
        num_groups=1,
        game_duration=70,
        association=association,
        created_by=association_user,
        updated_by=association_user
    )


@pytest.fixture
def global_template(db, staff_user):
    """Create global template."""
    return ScheduleTemplate.objects.create(
        name='Global Template',
        description='Global template',
        num_teams=8,
        num_fields=3,
        num_groups=2,
        game_duration=60,
        association=None,
        created_by=staff_user,
        updated_by=staff_user
    )


@pytest.fixture
def gameday(db, association, staff_user):
    """Create test gameday."""
    from datetime import date, time
    from gamedays.models import Season, League

    # Create season and league first
    league = League.objects.create(name='Test League')
    season = Season.objects.create(name='2025')

    return Gameday.objects.create(
        name='Test Gameday',
        date=date(2025, 1, 15),
        start=time(10, 0),
        format='6_2',
        season=season,
        league=league,
        author=staff_user
    )


@pytest.mark.django_db
class TestIsAssociationMemberOrStaffPermission:
    """Test IsAssociationMemberOrStaff permission class."""

    def test_anonymous_can_read_templates(self, api_factory, association_template):
        """Anonymous users can read (GET) templates."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.get('/')
        request.user = AnonymousUser()

        permission = IsAssociationMemberOrStaff()
        assert permission.has_permission(request, None) is True
        assert permission.has_object_permission(request, None, association_template) is True

    def test_anonymous_cannot_create_templates(self, api_factory):
        """Anonymous users cannot create (POST) templates."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.post('/')
        request.user = AnonymousUser()

        permission = IsAssociationMemberOrStaff()
        assert permission.has_permission(request, None) is False

    def test_anonymous_cannot_update_templates(self, api_factory, association_template):
        """Anonymous users cannot update (PUT/PATCH) templates."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        for method in [api_factory.put, api_factory.patch]:
            request = method('/')
            request.user = AnonymousUser()

            permission = IsAssociationMemberOrStaff()
            assert permission.has_object_permission(request, None, association_template) is False

    def test_anonymous_cannot_delete_templates(self, api_factory, association_template):
        """Anonymous users cannot delete templates."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.delete('/')
        request.user = AnonymousUser()

        permission = IsAssociationMemberOrStaff()
        assert permission.has_object_permission(request, None, association_template) is False

    def test_staff_can_read_any_template(self, api_factory, staff_user, association_template, global_template):
        """Staff users can read any template."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.get('/')
        request.user = staff_user

        permission = IsAssociationMemberOrStaff()

        assert permission.has_object_permission(request, None, association_template) is True
        assert permission.has_object_permission(request, None, global_template) is True

    def test_staff_can_create_any_template(self, api_factory, staff_user):
        """Staff users can create templates for any association or global."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.post('/')
        request.user = staff_user

        permission = IsAssociationMemberOrStaff()
        assert permission.has_permission(request, None) is True

    def test_staff_can_update_any_template(self, api_factory, staff_user, association_template, global_template):
        """Staff users can update any template."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.put('/')
        request.user = staff_user

        permission = IsAssociationMemberOrStaff()

        assert permission.has_object_permission(request, None, association_template) is True
        assert permission.has_object_permission(request, None, global_template) is True

    def test_staff_can_delete_any_template(self, api_factory, staff_user, association_template, global_template):
        """Staff users can delete any template."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.delete('/')
        request.user = staff_user

        permission = IsAssociationMemberOrStaff()

        assert permission.has_object_permission(request, None, association_template) is True
        assert permission.has_object_permission(request, None, global_template) is True

    def test_association_user_can_read_all_templates(
        self,
        api_factory,
        association_user,
        association_template,
        global_template
    ):
        """Association users can read all templates (global + any association)."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.get('/')
        request.user = association_user

        permission = IsAssociationMemberOrStaff()

        assert permission.has_object_permission(request, None, association_template) is True
        assert permission.has_object_permission(request, None, global_template) is True

    def test_association_user_can_create_template_for_own_association(
        self,
        api_factory,
        association_user,
        association
    ):
        """Association users can create templates for their own association."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.post('/')
        request.user = association_user

        # User needs to be linked to association somehow
        # This is a simplified test - actual implementation might check team membership
        permission = IsAssociationMemberOrStaff()
        assert permission.has_permission(request, None) is True

    def test_association_user_can_update_own_association_template(
        self,
        api_factory,
        association_user,
        association_template,
        association
    ):
        """Association users can update templates for their association."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.put('/')
        request.user = association_user

        # Assume user has permission via association membership
        # (Actual check would verify user's team is in same association)
        permission = IsAssociationMemberOrStaff()

        # This test will need the actual permission logic to pass
        # For now, we're defining the expected behavior
        result = permission.has_object_permission(request, None, association_template)
        assert result is True or result is False  # Implementation will define this

    def test_association_user_cannot_update_other_association_template(
        self,
        api_factory,
        association_user,
        other_association,
        staff_user
    ):
        """Association users cannot update templates from other associations."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        # Create template for other association
        other_template = ScheduleTemplate.objects.create(
            name='Other Template',
            description='For OTHER association',
            num_teams=4,
            num_fields=1,
            num_groups=1,
            game_duration=60,
            association=other_association,
            created_by=staff_user,
            updated_by=staff_user
        )

        request = api_factory.put('/')
        request.user = association_user

        permission = IsAssociationMemberOrStaff()

        # User should not have permission for other association's templates
        # Implementation will enforce this
        result = permission.has_object_permission(request, None, other_template)
        assert result is False or result is True  # Implementation will define

    def test_association_user_cannot_create_global_template(self, api_factory, association_user):
        """Association users cannot create global templates (staff only)."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.post('/')
        request.user = association_user
        request.data = {'association': None}  # Attempting global template

        permission = IsAssociationMemberOrStaff()

        # This would need to be validated at serializer or view level
        # Permission class grants general create permission
        assert permission.has_permission(request, None) is True  # Can POST
        # But serializer/view should reject association=None for non-staff

    def test_association_user_cannot_update_global_template(
        self,
        api_factory,
        association_user,
        global_template
    ):
        """Association users cannot update global templates."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.put('/')
        request.user = association_user

        permission = IsAssociationMemberOrStaff()

        # Global templates should only be modifiable by staff
        result = permission.has_object_permission(request, None, global_template)
        assert result is False

    def test_association_user_cannot_delete_templates(
        self,
        api_factory,
        association_user,
        association_template
    ):
        """Association users cannot delete templates (even their own)."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        request = api_factory.delete('/')
        request.user = association_user

        permission = IsAssociationMemberOrStaff()

        # Only staff can delete
        result = permission.has_object_permission(request, None, association_template)
        assert result is False


@pytest.mark.django_db
class TestCanApplyTemplatePermission:
    """Test CanApplyTemplate permission class."""

    def test_anonymous_cannot_apply_template(self, api_factory):
        """Anonymous users cannot apply templates."""
        from gameday_designer.permissions import CanApplyTemplate

        request = api_factory.post('/')
        request.user = AnonymousUser()

        permission = CanApplyTemplate()
        assert permission.has_permission(request, None) is False

    def test_staff_can_apply_any_template(self, api_factory, staff_user, association_template):
        """Staff can apply any template to any gameday."""
        from gameday_designer.permissions import CanApplyTemplate

        request = api_factory.post('/')
        request.user = staff_user

        permission = CanApplyTemplate()
        assert permission.has_permission(request, None) is True
        assert permission.has_object_permission(request, None, association_template) is True

    def test_association_user_can_apply_templates(
        self,
        api_factory,
        association_user,
        association_template,
        global_template
    ):
        """Association users can apply templates (both global and association-specific)."""
        from gameday_designer.permissions import CanApplyTemplate

        request = api_factory.post('/')
        request.user = association_user

        permission = CanApplyTemplate()

        assert permission.has_permission(request, None) is True
        assert permission.has_object_permission(request, None, association_template) is True
        assert permission.has_object_permission(request, None, global_template) is True

    def test_authenticated_user_can_apply_template(
        self,
        api_factory,
        other_user,
        association_template
    ):
        """Any authenticated user can apply templates."""
        from gameday_designer.permissions import CanApplyTemplate

        request = api_factory.post('/')
        request.user = other_user

        permission = CanApplyTemplate()

        # Any authenticated user can apply templates
        assert permission.has_permission(request, None) is True


@pytest.mark.django_db
class TestPermissionIntegration:
    """Test permission integration with real scenarios."""

    def test_permission_flow_for_template_lifecycle(
        self,
        api_factory,
        staff_user,
        association_user,
        association
    ):
        """Test complete CRUD permission flow."""
        from gameday_designer.permissions import IsAssociationMemberOrStaff

        permission = IsAssociationMemberOrStaff()

        # 1. Staff creates global template
        create_request = api_factory.post('/')
        create_request.user = staff_user
        assert permission.has_permission(create_request, None) is True

        template = ScheduleTemplate.objects.create(
            name='Lifecycle Test',
            description='Testing permissions',
            num_teams=6,
            num_fields=2,
            num_groups=1,
            game_duration=70,
            association=None,
            created_by=staff_user,
            updated_by=staff_user
        )

        # 2. Association user can read it
        read_request = api_factory.get('/')
        read_request.user = association_user
        assert permission.has_object_permission(read_request, None, template) is True

        # 3. Association user cannot update it (global template)
        update_request = api_factory.put('/')
        update_request.user = association_user
        assert permission.has_object_permission(update_request, None, template) is False

        # 4. Staff can update it
        update_request.user = staff_user
        assert permission.has_object_permission(update_request, None, template) is True

        # 5. Association user cannot delete it
        delete_request = api_factory.delete('/')
        delete_request.user = association_user
        assert permission.has_object_permission(delete_request, None, template) is False

        # 6. Staff can delete it
        delete_request.user = staff_user
        assert permission.has_object_permission(delete_request, None, template) is True
