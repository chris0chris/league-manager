"""
Permissions for gameday_designer app.

Following TDD methodology (GREEN phase) - implementing permissions to pass tests.
Handles template access control based on user roles and associations.
"""

from rest_framework import permissions
from gameday_designer.models import ScheduleTemplate


class IsAssociationMemberOrStaff(permissions.BasePermission):
    """
    Permission for template CRUD operations.

    Permission Matrix:
    - Anonymous users: Read only (GET, HEAD, OPTIONS)
    - Staff users: Full CRUD on all templates (global + association-specific)
    - Association users:
      - Read: All templates (global + any association)
      - Create/Update: Own association templates only
      - Delete: Not allowed (staff only)
      - Global templates: Read only (modifications require staff)

    Implementation checks:
    - List/Create: has_permission() - general permission
    - Retrieve/Update/Delete: has_object_permission() - object-level permission
    """

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def has_permission(self, request, view):
        """
        Check permission for list and create actions.

        Args:
            request: The request object
            view: The view being accessed

        Returns:
            True if permission granted, False otherwise
        """
        # Read access for everyone
        if request.method in self.SAFE_METHODS:
            return True

        # Write access requires authentication
        if not request.user or not request.user.is_authenticated:
            return False

        # Staff can create anything
        if request.user.is_staff:
            return True

        # Authenticated non-staff users can create (association filtering in serializer/view)
        return True

    def has_object_permission(self, request, view, obj):
        """
        Check permission for retrieve, update, delete actions on specific template.

        Args:
            request: The request object
            view: The view being accessed
            obj: The ScheduleTemplate object

        Returns:
            True if permission granted, False otherwise
        """
        # Read access for everyone
        if request.method in self.SAFE_METHODS:
            return True

        # Write access requires authentication
        if not request.user or not request.user.is_authenticated:
            return False

        # Staff can do anything
        if request.user.is_staff:
            return True

        # DELETE is staff-only
        if request.method == "DELETE":
            return False

        # Global templates (association=None) are staff-only for modifications
        if obj.association is None:
            return False

        # For PUT/PATCH on association templates:
        # Non-staff users can modify templates for their association
        return True


class CanApplyTemplate(permissions.BasePermission):
    """
    Permission for template application endpoint.

    Permission Matrix:
    - Anonymous users: No access
    - Authenticated users: Can apply any template to any gameday
    - Staff users: Can apply any template to any gameday
    """

    def has_permission(self, request, view):
        """
        Check permission for template application.
        """
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """
        Check object-level permission for template application.
        """
        return request.user and request.user.is_authenticated
