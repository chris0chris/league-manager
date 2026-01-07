# Tech Stack - LeagueSphere

## Backend
- **Framework:** Django 5.2+ with Django REST Framework (DRF).
- **Language:** Python.
- **Authentication:** Knox Token Authentication.
- **Task Management:** Django management commands.

## Frontend
- **Framework:** React (using Functional Components and Hooks).
- **Language:** TypeScript.
- **Build Tool:** Vite.
- **State Management:** Context API (preferred) and Redux (legacy/specialized).
- **Styling:** Bootstrap 5 with React Bootstrap.
- **Internationalization:** i18next / react-i18next.

## Database
- **Engine:** MySQL / MariaDB.

## Development & DevOps
- **Python Package Manager:** `uv`.
- **Frontend Package Manager:** `npm`.
- **Testing:** `pytest` (Backend), `vitest` (Frontend).
- **Containerization:** Docker.
- **Deployment:** Ansible (managed via `infrastructure/`).
- **Web Server:** Gunicorn (Backend), Nginx (Frontend).
- **CI/CD:** CircleCI and GitHub Actions.
