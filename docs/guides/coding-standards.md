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
- **Typing**: No `any`. Use interfaces and types for all props, states, and API responses. If necessary to work around type constraints, use proper type syntax like `ReturnType<typeof someFunction>` instead of `as any`.
- **Tests**: Use `vitest` for all frontend unit and integration tests.
- **Linting**: All TypeScript/JavaScript code MUST pass ESLint checks before committing. See "Linting Standards" below.

## 🔍 Linting Standards

### ESLint (TypeScript/JavaScript)
All frontend code MUST pass ESLint before committing. Run before pushing:
```bash
npm run eslint
```

**Critical Rules Enforced:**
- **`@typescript-eslint/no-explicit-any`**: Never use `as any` type assertions. Replace with proper types:
  - ❌ BAD: `mockApi.mockResolvedValue({} as any)`
  - ✅ GOOD: `mockApi.mockResolvedValue({} as ReturnType<typeof api>)`
  - ✅ GOOD: Type the object explicitly: `mockApi.mockResolvedValue<ApiResponse>({...})`

- **`@typescript-eslint/no-unused-vars`**: Remove unused imports and variables.

- **Deprecation Warnings**: Replace deprecated methods:
  - ❌ BAD: `.substr(2, 9)` (deprecated)
  - ✅ GOOD: `.slice(2, 11)` (current standard)

**Random Number Generation:**
- ❌ BAD: `Math.random()` for security-sensitive values (sessions, tokens, IDs)
- ✅ GOOD: `crypto.getRandomValues()` for cryptographically secure randomness

### Running Linting
```bash
# Check for lint errors
npm run eslint

# Format code (if available)
npm run prettier
```

## 💅 Styling and UI
- Use consistent spacing (multiples of 4px/8px).
- Interactive elements must provide visual feedback (hover, active states).
- All new features must be mobile-responsive by default.

## 🛡 Security Practices
- **Never Log Secrets**: RIGOROUSLY avoid logging or printing API keys, passwords, or tokens.
- **Input Validation**: All data from the client MUST be validated in the backend, even if already checked in the frontend.
- **Token Handling**: Use Knox tokens for API authentication; ensure they are handled securely in frontend storage.
