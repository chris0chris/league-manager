from unittest.mock import MagicMock

from django.test import TestCase

from gamedays.models import Team
from league_manager.utils.view_utils import PermissionHelper


class PermissionHelperTests(TestCase):
    def test_has_staff_or_user_permission_for_staff(self):
        mock_user = MagicMock(is_staff=True, username='staff_user')
        mock_request = MagicMock(user=mock_user)

        result = PermissionHelper.has_staff_or_user_permission(mock_request)
        self.assertTrue(result, "The user is staff, so the permission should be True")

    def test_has_staff_or_user_permission_for_user(self):
        mock_user = MagicMock(is_staff=False, username='regular_user')
        mock_request = MagicMock(user=mock_user)

        with self.subTest('Team exists'):
            Team.objects.get = MagicMock(return_value=Team(name='regular_user'))
            result = PermissionHelper.has_staff_or_user_permission(mock_request)
            self.assertTrue(
                result,
                "The user's username matches the team's name, so the permission should be True"
            )

        with self.subTest('Team does not exist'):
            Team.objects.get = MagicMock(side_effect=Team.DoesNotExist())
            result = PermissionHelper.has_staff_or_user_permission(mock_request)
            self.assertFalse(
                result,
                "The user is not staff, and the team does not exist, so the permission should be False"
            )
        # if mock isn't deleted explicitly it will stay active for all the other tests and some will fail
        del Team.objects.get
