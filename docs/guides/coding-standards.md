# Coding and Development Standards

LeagueSphere maintains high-quality standards across its polyglot codebase (Python, TypeScript, HTML/CSS).

## 🧩 Architectural Principles
- **Separation of Concerns**: Business logic should reside in Django `service/` modules or React `hooks/`.
- **DRY (Don't Repeat Yourself)**: Shared utilities are centralized in `league_manager/utils/` (backend) or `src/lib/` (frontend).
- **SOLID**: Aim for single-responsibility components and classes.

## 🐍 Python / Django Standards
- **Version**: Django 5.2+; Python 3.12+.
- **Formatting**: Strictly follow `black .` for formatting.
- **Typing**: Use type hints where practical to improve code clarity and IDE support.
- **REST APIs**: Use Django REST Framework (DRF) with explicit serializers for all external endpoints.
- **Tests**: Every new feature requires a `pytest` suite in the app's `tests/` directory.

## ⚛ TypeScript / React Standards
- **Framework**: Vite-based applications.
- **State Management**: Prefer React Context for new state or Redux if established in a legacy component.
- **Styling**: Standard Vanilla CSS is preferred for all new components to maintain platform-native feel and flexibility.
- **Typing**: No `any`. Use interfaces and types for all props, states, and API responses.
- **Tests**: Use `vitest` for all frontend unit and integration tests.

## 💅 Styling and UI
- Use consistent spacing (multiples of 4px/8px).
- Interactive elements must provide visual feedback (hover, active states).
- All new features must be mobile-responsive by default.

## 🛡 Security Practices
- **Never Log Secrets**: RIGOROUSLY avoid logging or printing API keys, passwords, or tokens.
- **Input Validation**: All data from the client MUST be validated in the backend, even if already checked in the frontend.
- **Token Handling**: Use Knox tokens for API authentication; ensure they are handled securely in frontend storage.
