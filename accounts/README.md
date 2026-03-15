# Accounts App

This Django application manages user accounts, authentication, and API tokens using Django REST Framework and Knox.

## Components
- `api.py`: REST API endpoints for login, logout, and user information.
- `serializers.py`: Data transformation for user and token models.
- `urls.py`: Routing for account-related endpoints.

## Integration
Uses `django-rest-knox` for secure, token-based authentication.
