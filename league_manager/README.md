# League Manager Core

The central Django project directory containing core settings, global routing, and shared utilities.

## Structure
- `settings/`: Environment-specific Django configurations (base, dev, prod).
- `urls.py`: Main URL dispatcher for the entire project.
- `middleware/`: Custom Django middleware for request/response processing.
- `templates/`: Global HTML templates and base layouts.
- `utils/`: Shared helper functions used across multiple apps.

## Configuration
Controlled primarily via environment variables and the `league_manager` variable (e.g., `league_manager=dev`).
