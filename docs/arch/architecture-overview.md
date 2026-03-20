# System Architecture Overview

LeagueSphere follows a modern hybrid architecture, combining a robust Django backend with several specialized React frontend applications.

## 🏗 High-Level Architecture

### Backend: Django 5.2 (REST Framework)
- **Role**: Serves as the central API, manages data persistence, handles authentication (DRF + Knox), and performs complex business logic for tournament management.
- **Key Modules**:
  - `gamedays`: Core scheduling and tournament logic.
  - `accounts`: User authentication and authorization.
  - `league_table`: Dynamic standings calculation.
  - `teammanager`: Club and roster management.

### Frontend: Multiple React Apps (Vite)
- **Role**: Provides rich, interactive user interfaces for specific roles (officials, managers, fans).
- **Independent Apps**:
  - `gameday_designer`: Flowchart-based scheduling tool.
  - `passcheck`: Player eligibility verification.
  - `liveticker`: Real-time fan updates.
  - `scorecard`: On-field scoring interface.
- **Integration**: Apps are developed as standalone Vite projects and built into the Django `static/` directory to be served by Django templates.

### Database: MariaDB / MySQL
- **Production**: MariaDB (standard for Linux/LXC environments).
- **Testing**: Dedicated MariaDB instance in an LXC container (`servyy-test`).

## ⚙ Integration Patterns

### API Communication
- All frontend apps communicate with the Django backend via a RESTful API.
- Endpoints follow the `api/` prefix (e.g., `/api/gamedays/`).
- Authentication is handled via Knox tokens.

### Static Assets
- Django's `collectstatic` command aggregates all built frontend assets and project-wide static files for production delivery.
- Frontend apps use Vite's `base` configuration to align with Django's static URL structure.

## 🛡 Security and Scalability
- **Security**: Mandatory token authentication for sensitive operations; strict validation of player eligibility in the backend.
- **Scalability**: Decoupled frontends allow for independent scaling and maintenance; load-tested with Locust.

Refer to `docs/arch/` for specific ADRs (Architectural Decision Records).
