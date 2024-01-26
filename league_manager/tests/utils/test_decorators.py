from unittest.mock import Mock, patch

from league_manager.utils.decorators import is_staff


@is_staff
def example_view(request, *args, **kwargs):
    return kwargs


class TestIsStaffDecorator:
    @patch('league_manager.utils.view_utils.PermissionHelper.has_staff_or_user_permission')
    def test_is_staff_decorator(self, permission_helper_mock: Mock):
        permission_helper_mock.return_value = True
        mock_request = Mock(request=Mock())

        kwargs = example_view(mock_request, team=7)

        assert kwargs['is_staff'] is True
        assert permission_helper_mock.call_count == 1
