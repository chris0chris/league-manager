import pytest

from django.contrib.auth.models import User


@pytest.fixture
def super_user(db):
    return User.objects.create_superuser('test_user', password='some_password')
