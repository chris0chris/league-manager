# Agent Workflow Adoption Plan for LeagueSphere

## Executive Summary

This document outlines the plan to adopt the 7-agent development workflow from the energy.consumption project to LeagueSphere, a Django-based flag football league management application. The workflow will be adapted to support Django/Python backend development alongside React/TypeScript frontend development, with special emphasis on flag football domain expertise.

## Table of Contents

1. [Project Analysis](#project-analysis)
2. [Agent Workflow Overview](#agent-workflow-overview)
3. [Adaptation Requirements](#adaptation-requirements)
4. [Flag Football Domain Knowledge](#flag-football-domain-knowledge)
5. [Implementation Plan](#implementation-plan)
6. [Agent Specifications](#agent-specifications)
7. [Testing Strategy](#testing-strategy)
8. [Success Criteria](#success-criteria)

---

## Project Analysis

### Current LeagueSphere Architecture

**Backend (Django 5.2+)**:
- Framework: Django with Django REST Framework
- Authentication: Knox token authentication
- Database: MySQL
- Testing: pytest (~302 tests, ~83.9% coverage)
- Code Quality: black (formatter)
- Settings: Environment-based (dev, base, prod)

**Frontend (Multiple React Apps)**:
1. **passcheck**: TypeScript/React with Context API
   - Player eligibility verification
   - Built with webpack

2. **liveticker**: JavaScript/React with Redux
   - Real-time game ticker
   - Built with webpack

3. **scorecard**: JavaScript/React with Redux
   - Live game scoring interface
   - Built with webpack

**Django Apps Structure**:
- `gamedays` - Core game scheduling and management
- `scorecard` - Live scoring backend
- `liveticker` - Real-time ticker backend
- `passcheck` - Player eligibility backend
- `league_table` - League standings
- `officials` - Game officials management
- `teammanager` - Team and roster management
- `accounts` - User authentication

**Technology Stack**:
- **Python**: Django 5.2.7, DRF 3.16.1, pytest 8.4.2
- **JavaScript/TypeScript**: React 19.2.0, Redux, webpack 5.102.1, Jest 30.2.0
- **Database**: MySQL/MariaDB
- **CI/CD**: GitHub Actions with artifact-based Docker builds
- **Deployment**: Docker (backend + frontend containers)

### Development Requirements

**Python Dependencies** (requirements.txt):
- Django ecosystem: django-crispy-forms, django-cors-headers, django-rest-knox
- Data handling: numpy, pandas, django-pandas
- API: djangorestframework, Markdown
- Images: Pillow
- Database: mysqlclient
- Utilities: python-dotenv, requests
- Health: django-health-check

**Test Dependencies** (test_requirements.txt):
- Testing: pytest, pytest-django, pytest-cov, django-webtest
- Factories: factory-boy
- Tools: black, bump2version, django-debug-toolbar

**JavaScript Dependencies** (all 3 React apps):
- Core: React 19.2.0, Redux, react-router-dom
- State: @reduxjs/toolkit, redux-thunk
- API: axios
- Testing: Jest 30.2.0, @testing-library/react
- Linting: ESLint 9.39.0
- Build: webpack 5.102.1

---

## Agent Workflow Overview

The workflow consists of 7 specialized agents working in sequence:

```
User Input
    ↓
1. Requirements Analyst (Blue)
    ↓ requirements.md, test-scenarios.md
    ↓
[2. Architecture Designer (Purple)] ← Optional for complex features
    ↓ architecture.md
    ↓
3. Implementation Engineer (Green)
    ↓ Tests + Code + implementation-notes.md
    ↓
4. QA Engineer (Red)
    ↓ QA Report (Pass/Fail)
    ↓
[5. Documentation Specialist (Cyan)] ← Optional
    ↓ user-guide.md, api-documentation.md
    ↓
[6. Cleanup Coordinator (Yellow)] ← Optional
    ↓ cleanup-report.md
    ↓
7. Git Coordinator (Orange)
    ↓ Commits + Pull Request
    ↓
Code Review → Merge
```

**Key Principles**:
- Test-Driven Development (TDD)
- SOLID principles
- Clean code practices
- Comprehensive documentation
- Quality gates at each step
- PR hygiene and dead code removal

---

## Adaptation Requirements

### General Adaptations

1. **Dual-Language Support**:
   - Agents must handle both Python (Django backend) and JavaScript/TypeScript (React frontend)
   - Test commands differ: `pytest` vs `npm test`
   - Different linting tools: `black` vs `eslint`
   - Different project structures

2. **Django-Specific Considerations**:
   - Django apps architecture
   - Django REST Framework patterns
   - Django migrations
   - Django testing patterns (TestCase, fixtures, factory_boy)
   - Settings management (dev/base/prod)

3. **React/Redux Patterns**:
   - Redux state management (liveticker, scorecard)
   - Context API (passcheck)
   - Component testing with React Testing Library
   - Jest configuration and snapshot testing

4. **Project Structure**:
   - Django backend at root level
   - Three separate React apps (passcheck/, liveticker/, scorecard/)
   - Each React app has its own package.json and webpack config
   - Static files integration between Django and React

### Mobile-First to Web-Based Adaptation

**REMOVE** from requirements-analyst:
- Mobile-first design emphasis
- Touch-first interactions
- Mobile-specific features (camera, GPS, push notifications)
- Mobile viewport testing
- Screen size focus on mobile devices
- Offline mode requirements
- App store integration

**ADD** to requirements-analyst:
- Web application focus (desktop and tablet primary)
- Mouse/keyboard interactions primary
- Browser compatibility requirements
- Responsive web design (desktop → tablet)
- Desktop-optimized workflows
- Real-time updates (for live scoring)
- Multi-user collaboration features

### QA Engineer Adaptations

**Browser Testing Changes**:
- **Primary**: Desktop browsers (Chrome, Firefox, Safari, Edge)
- **Secondary**: Tablet browsers
- **Focus**: Desktop workflows, keyboard navigation, mouse interactions
- **Remove**: Mobile-first testing, touch targets, mobile gestures

**Testing Commands**:
```bash
# Python/Django testing
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest

# JavaScript testing (per app)
npm --prefix passcheck/ test
npm --prefix liveticker/ run jest
npm --prefix scorecard/ run jest

# Linting
black .  # Python
npm --prefix liveticker/ run eslint
npm --prefix scorecard/ run eslint
npm --prefix passcheck/ run eslint
```

---

## Flag Football Domain Knowledge

### Requirements Analyst Enhancement

The Requirements Analyst must be transformed into a **Flag Football & League Management Specialist** who understands:

#### 1. Flag Football Game Rules & Structure

**Game Fundamentals**:
- **Teams**: Typically 5-7 players per side
- **Field**: Smaller than tackle football (40-50 yards)
- **Scoring**: Touchdowns (6 points), Extra points (1 or 2), Safeties (2 points)
- **Gameplay**: No tackling - pulling flags stops play
- **Timing**: Typically 4 quarters or 2 halves, game clock management
- **Positions**: QB, Center, Receivers, Rusher, Defensive positions

**Rule Variations**:
- League-specific rules (e.g., rushing allowed after X seconds)
- Co-ed rules (minimum female players on field)
- Age divisions (youth, adult, masters)
- Playoff/tournament rules vs regular season

#### 2. League Management Concepts

**Season Structure**:
- **Regular Season**: Round-robin, divisional play, conference structure
- **Playoffs**: Single elimination, bracket formats
- **Scheduling**: Game days, field assignments, time slots
- **Bye weeks**: Teams without games

**Team Management**:
- **Rosters**: Player registration, eligibility, maximum/minimum players
- **Pass Checking**: Player eligibility verification (photo ID, registration status)
- **Team Classifications**: Divisions, skill levels, age groups

**Player Eligibility**:
- **Registration**: Season registration requirements
- **Pass Cards**: Physical or digital player credentials
- **Photo Verification**: Match player to registration photo
- **Status**: Active, injured reserve, suspended
- **Multi-team Rules**: Can players play for multiple teams?

**Officials Management**:
- **Referee Assignments**: Who officiates which games
- **Certification Levels**: Different referee qualifications
- **Scheduling**: Referee availability and assignments
- **Payment Tracking**: Referee compensation

#### 3. Game Day Operations

**Pre-Game**:
- **Field Setup**: Which field, what time
- **Team Check-in**: Roster verification
- **Pass Checking**: Player eligibility confirmation
- **Equipment Check**: Flags, jerseys, cleats rules

**Live Game Tracking**:
- **Scoring**: Real-time score entry
- **Statistics**: Touchdowns, interceptions, rushing yards, etc.
- **Clock Management**: Game time, timeouts, stoppages
- **Liveticker**: Play-by-play updates for spectators

**Post-Game**:
- **Score Reporting**: Final scores to league standings
- **Statistics**: Game stats for league records
- **Incident Reports**: Unsportsmanlike conduct, injuries

#### 4. League Standings & Statistics

**Standings Calculations**:
- **Win-Loss Records**: W-L-T percentages
- **Point Differential**: Total points for/against
- **Tiebreakers**: Head-to-head, point differential, etc.
- **Division Rankings**: Multi-division leagues
- **Playoff Seeding**: Automatic bids, wildcards

**Player Statistics**:
- **Offensive Stats**: Passing yards, TDs, rushing yards, receptions
- **Defensive Stats**: Interceptions, sacks, flag pulls
- **Season Leaders**: Top performers in categories

#### 5. Common League Management Requirements

**Schedule Generation**:
- **Constraints**: Field availability, team preferences
- **Balance**: Fair distribution of game times/fields
- **Conflicts**: Avoid scheduling teams with shared players
- **Playoffs**: Bracket generation based on standings

**Communication**:
- **Notifications**: Game reminders, schedule changes
- **Results**: Score updates, standings updates
- **Announcements**: League-wide communications

**External Integrations**:
- **Moodle**: Team/player registration (as indicated in CLAUDE.md)
- **Equipment Approval**: Player equipment verification
- **Google Sheets**: Schedule templates
- **Email/SMS**: Notifications

#### 6. Business Logic Examples

**Player Eligibility Rules**:
```python
# Example business logic the analyst should understand
def is_player_eligible(player, game):
    """
    Player must:
    - Be registered for current season
    - Be on a team roster
    - Have valid pass card with photo
    - Not be suspended
    - Meet age/gender requirements for division
    """
    if not player.is_registered(game.season):
        return False, "Not registered for season"
    if not player.on_team_roster(game.team):
        return False, "Not on team roster"
    if player.is_suspended():
        return False, "Player suspended"
    if not player.meets_division_requirements(game.division):
        return False, "Does not meet division requirements"
    return True, "Eligible"
```

**Standings Calculation**:
```python
# Example standings logic
def calculate_standings(division):
    """
    Standings ordered by:
    1. Win percentage
    2. Head-to-head record (if tied)
    3. Point differential
    4. Total points scored
    """
    teams = division.teams.all()
    for team in teams:
        team.win_pct = team.wins / (team.wins + team.losses + team.ties)
        team.point_diff = team.points_for - team.points_against
    return sorted(teams, key=lambda t: (t.win_pct, t.point_diff, t.points_for), reverse=True)
```

### Domain-Specific Terminology

The Requirements Analyst should understand and use correct terminology:

**Games**:
- Gameday, matchup, fixture, contest
- Kickoff time, game slot
- Field assignment

**Scoring**:
- Touchdown (TD), extra point (XP), conversion, safety
- Pick-six (interception return TD)
- Points for/against, point differential

**Teams**:
- Roster, squad, lineup
- Starting lineup, substitutions
- Home team, away team, neutral site

**Players**:
- Eligible player, registered player
- Active roster, injured reserve
- Pass card, player card

**Leagues**:
- Division, conference, tier
- Regular season, playoffs, championship
- Seed, wildcard, bye

**Officials**:
- Head referee, line judge, back judge
- Crew, officiating team
- Certified referee

---

## Implementation Plan

### Phase 1: Agent Creation (Week 1)

#### Step 1.1: Create Agent Directory Structure
```bash
mkdir -p .claude/agents
```

#### Step 1.2: Adapt Requirements Analyst
- Start with energy.consumption requirements-analyst.md
- Remove mobile-first sections
- Add flag football domain knowledge section
- Add Django/React specific sections
- Update tools list (remove mcp-google-chrome if not needed for web testing)
- Update examples to use football league scenarios

**Key Changes**:
```markdown
## Development Context

**Primary Target**: Web application (Desktop/Tablet)
**Secondary Target**: Mobile web (must be functional)

This means:
- **Desktop-first design** - Primary user experience is on desktop browsers
- **Responsive design required** - Must adapt to tablet and mobile screens
- **Mouse/keyboard primary** - Optimize for mouse and keyboard, support touch
- **Performance** - Consider various network conditions
- **Screen sizes** - Design for desktop first, scale down for mobile

## Flag Football & League Management Domain Expertise

You are a specialist in American flag football league management and understand:

[Insert comprehensive flag football domain knowledge from section above]
```

#### Step 1.3: Adapt Architecture Designer
- Minimal changes needed
- Add Django architecture patterns:
  - Django apps structure
  - Django REST Framework viewsets/serializers
  - Django models and migrations
  - Django middleware and signals
- Add React/Redux patterns:
  - Redux store structure
  - React component hierarchy
  - API integration patterns

**Add Django-Specific Sections**:
```markdown
### Django Architecture Patterns

**App Structure**:
- Each Django app follows single responsibility
- Models in models.py (database layer)
- Views/ViewSets in views.py (API layer)
- Serializers in serializers.py (data transformation)
- URLs in urls.py (routing)
- Services layer for complex business logic

**Django REST Framework**:
- ViewSets for CRUD operations
- Serializers for data validation/transformation
- Permissions for access control
- Filtering, pagination, ordering
- Nested routes for related resources

**React/Redux Integration**:
- Django serves React static bundles
- API endpoints under /api/
- Token authentication (Knox)
- CORS configuration for local development
```

#### Step 1.4: Adapt Implementation Engineer
- Support both Python and JavaScript/TypeScript
- Add pytest patterns
- Add Jest patterns
- Add Django-specific TDD examples
- Add React testing examples

**Key Additions**:
```markdown
## Language-Specific Testing

### Python/Django Testing

**Test Structure**:
```python
# tests/test_gamedays.py
import pytest
from django.test import TestCase
from gamedays.models import Game
from gamedays.factories import GameFactory

class TestGameModel(TestCase):
    """Test Game model functionality."""

    def test_create_game(self):
        """Test game creation."""
        # Arrange
        game = GameFactory()

        # Act
        game.save()

        # Assert
        assert game.id is not None
        assert Game.objects.count() == 1
```

**Django Test Commands**:
```bash
# Run all tests
pytest

# Run specific test file
pytest gamedays/tests/test_views.py

# Run with coverage
pytest --cov=gamedays --cov-report=html
```

### JavaScript/React Testing

**Test Structure**:
```javascript
// src/components/__tests__/ScoreEntry.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import ScoreEntry from '../ScoreEntry';

describe('ScoreEntry', () => {
  test('updates score when touchdown button clicked', () => {
    // Arrange
    const mockOnScore = jest.fn();
    render(<ScoreEntry onScore={mockOnScore} />);

    // Act
    fireEvent.click(screen.getByText('Touchdown'));

    // Assert
    expect(mockOnScore).toHaveBeenCalledWith({ type: 'TD', points: 6 });
  });
});
```

**React Test Commands**:
```bash
# Run Jest tests (liveticker)
npm --prefix liveticker/ run jest

# Run with coverage
npm --prefix liveticker/ run jest --coverage

# Watch mode
npm --prefix liveticker/ run testj:watch
```
```

#### Step 1.5: Adapt QA Engineer
- Support both Python and JavaScript testing
- Remove mobile-first testing
- Add desktop/web browser testing
- Add Django-specific checks (migrations, model validations)
- Update test commands for LeagueSphere

**Major Updates**:
```markdown
## Test Execution Commands

### Python/Django Tests
```bash
# Setup test database (LXC container)
cd container && ./spinup_test_db.sh

# Run all tests
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest

# Run with coverage
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest --cov=. --cov-report=html --cov-report=xml

# Quick tests (no migrations)
pytest --nomigrations --reuse-db
```

### JavaScript/React Tests
```bash
# passcheck (uses react-scripts)
npm --prefix passcheck/ test

# liveticker
npm --prefix liveticker/ run jest
npm --prefix liveticker/ run testj:watch

# scorecard
npm --prefix scorecard/ run jest
npm --prefix scorecard/ run testj:watch
```

### Code Quality Checks
```bash
# Python formatting
black .

# JavaScript linting
npm --prefix passcheck/ run eslint
npm --prefix liveticker/ run eslint
npm --prefix scorecard/ run eslint
```

### Django-Specific Checks
```bash
# Check for migration issues
python manage.py makemigrations --check --dry-run

# Check for model issues
python manage.py check

# Validate migrations
python manage.py migrate --plan
```

## Browser Testing

### Desktop Testing (Primary)
- Set browser to desktop viewport (1920x1080, 1366x768)
- Test mouse interactions
- Test keyboard navigation (Tab, Enter, Escape)
- Test form inputs with keyboard
- Verify desktop layouts
- Test multi-window/tab workflows (e.g., live scoring + liveticker)
- Take screenshots of desktop views

### Tablet Testing (Secondary)
- Set browser to tablet viewport (768px-1024px)
- Test responsive layouts
- Verify touch interactions work
- Check navigation pattern changes
- Take screenshots of tablet views

### Responsive Breakpoints
- Desktop: 1024px+
- Tablet: 768px-1023px
- Mobile web: 320px-767px (functional, not primary)

### Django-Specific Testing
- **Admin Interface**: Test Django admin functionality
- **API Endpoints**: Test REST API endpoints
- **Authentication**: Test Knox token auth
- **CORS**: Verify CORS headers for frontend
```

#### Step 1.6: Copy Documentation Specialist
- Minimal changes
- Already generic enough for any project

#### Step 1.7: Copy Cleanup Coordinator
- Minimal changes
- Already generic enough for any project
- Update examples to reference LeagueSphere file structures if needed

#### Step 1.8: Adapt Git Coordinator
- Add check for both Python and JavaScript tests
- Update quality check commands
- Consider branch naming conventions for LeagueSphere

**Update Quality Checks**:
```markdown
### Phase 2: Pre-Commit Checks

Run automated checks for both backend and frontend:

```bash
# Python tests
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest --nomigrations --reuse-db

# Python formatting check
black --check .

# JavaScript tests (all apps)
npm --prefix passcheck/ test -- --watchAll=false
npm --prefix liveticker/ run jest
npm --prefix scorecard/ run jest

# JavaScript linting
npm --prefix liveticker/ run eslint
npm --prefix scorecard/ run eslint
npm --prefix passcheck/ run eslint

# Django checks
python manage.py check
python manage.py makemigrations --check --dry-run
```
```

### Phase 2: Documentation Creation (Week 1-2)

#### Step 2.1: Create AGENT_WORKFLOW_SETUP.md
Adapt the energy.consumption AGENT_WORKFLOW_SETUP.md for LeagueSphere:
- Update technology stack references
- Change mobile-first to web-based examples
- Add flag football domain examples
- Update test command examples

**Example Scenario**:
```markdown
### Example 1: Building a Complex New Feature

```
User: I need a playoff bracket generation system that automatically creates single-elimination brackets based on regular season standings, handles bye weeks for top seeds, and allows manual seeding adjustments.

Claude: This is a complex feature. I'll start with requirements analysis, then architecture design.

[Invokes requirements-analyst agent]
→ Produces detailed technical specification in feature-dev/playoff-brackets/
  - requirements.md (functional & non-functional requirements)
  - test-scenarios.md (all test cases)
  - Initial user-guide.md structure

→ Requirements analyst applies flag football domain knowledge:
  - Understands playoff seeding rules
  - Knows tiebreaker logic (head-to-head, point differential)
  - Understands bye week rules for top seeds
  - Familiar with single-elimination bracket structure
  - Considers division winners vs wildcards

Claude: This is a complex feature with bracket generation algorithms. Let me design the architecture.

[Invokes architecture-designer agent]
→ Creates architecture.md with:
  - Bracket generation algorithm design
  - Django models for Playoff, Bracket, MatchupNode
  - Seeding calculation logic
  - API endpoints for bracket CRUD
  - React component hierarchy for bracket display
  - Real-time updates for bracket progression
  - Data models and schemas
  - Integration with existing standings system
  - Architecture Decision Records (ADRs)

[Continue with implementation, QA, documentation, cleanup, git workflow...]
```
```

#### Step 2.2: Update CLAUDE.md
Add agent workflow section to existing CLAUDE.md:

```markdown
## Development Workflow with Agents

LeagueSphere uses a 7-agent development workflow to ensure high-quality, well-tested, and well-documented code:

### Agent Workflow

1. **requirements-analyst** - Flag football domain specialist who analyzes requirements
2. **architecture-designer** - Designs system architecture for complex features
3. **implementation-engineer** - Builds code following TDD and SOLID principles
4. **qa-engineer** - Runs comprehensive quality checks (tests, lint, coverage)
5. **documentation-specialist** - Creates user guides and API documentation
6. **cleanup-coordinator** - Ensures PR hygiene and removes dead code
7. **git-coordinator** - Creates commits and pull requests

### Usage

For new features:
```bash
# Start with requirements analysis
Use the requirements-analyst agent to analyze this feature: "Add game scheduling conflicts detection"

# For complex features, use architecture design
Use the architecture-designer agent to design the playoff bracket system

# Implement with TDD
Use the implementation-engineer agent to implement the specification

# Verify quality
Use the qa-engineer agent to validate the implementation

# Create documentation
Use the documentation-specialist agent to create user documentation

# Clean up workspace
Use the cleanup-coordinator agent to ensure PR hygiene

# Create PR
Use the git-coordinator agent to commit and create a pull request
```

### Feature Documentation Structure

All features are documented in `feature-dev/[feature-name]/`:
- `requirements.md` - Technical specifications
- `architecture.md` - System design (for complex features)
- `implementation-notes.md` - Implementation decisions
- `test-scenarios.md` - Test cases and coverage
- `user-guide.md` - User-facing documentation
- `api-documentation.md` - API reference

### Quality Standards

- **Test Success**: 100% of tests must pass
- **Coverage**: Target ~84% (current project standard)
- **Code Quality**: Zero critical lint errors
- **Security**: No high-severity vulnerabilities
- **SOLID Principles**: Applied throughout codebase
- **Documentation**: Complete in feature-dev/ directory
```

### Phase 3: Testing & Validation (Week 2)

#### Step 3.1: Test Requirements Analyst with Sample Feature
Create a test feature request:

```
User: I need a feature that tracks player statistics during games.
When a touchdown is scored, I want to record who threw the pass
(if applicable), who caught it or ran it in, and update season
statistics. This should integrate with our live scoring system.
```

**Expected Output**:
- feature-dev/player-statistics/requirements.md
  - Should demonstrate flag football knowledge (TD types: passing TD, rushing TD)
  - Should understand integration with scorecard app
  - Should define data models (PlayerStats, GameStats, SeasonStats)
  - Should consider edge cases (defensive TDs, safeties)
  - Should reference Django ORM patterns
  - Should consider React state updates for live stats

#### Step 3.2: Test Architecture Designer
Use the requirements from 3.1 to test architecture design.

**Expected Output**:
- feature-dev/player-statistics/architecture.md
  - Django models for stats tracking
  - DRF serializers and viewsets
  - React Redux actions/reducers for stats state
  - WebSocket/polling for real-time updates
  - Integration points with scorecard/liveticker apps

#### Step 3.3: Test Full Workflow
Run a small real feature through the complete workflow:
- Requirements analyst
- Architecture designer
- Implementation engineer
- QA engineer
- Documentation specialist
- Cleanup coordinator
- Git coordinator

#### Step 3.4: Validate Test Commands
Ensure QA engineer can successfully run:
- Python tests with correct environment variables
- JavaScript tests for all 3 React apps
- Linting for Python and JavaScript
- Django-specific checks

### Phase 4: Refinement (Week 2-3)

#### Step 4.1: Gather Feedback
- Review generated documentation quality
- Check test coverage and quality
- Verify SOLID principles application
- Assess flag football domain accuracy

#### Step 4.2: Refine Agents
Based on feedback:
- Improve requirements analyst domain knowledge
- Enhance architecture patterns
- Refine testing strategies
- Improve documentation templates

#### Step 4.3: Create Example Feature
Implement one complete feature using the workflow:
- Document the process
- Capture lessons learned
- Create example in docs/examples/

---

## Agent Specifications

### 1. Requirements Analyst

**File**: `.claude/agents/requirements-analyst.md`

**Key Attributes**:
```yaml
name: requirements-analyst
description: Requirements analysis specialist with flag football and league management expertise. Transforms user input into clear, actionable technical specifications. Use proactively when starting new features.
tools: Read, Write, Grep, Glob, TodoWrite, WebSearch
model: sonnet
color: blue
```

**Domain Knowledge Sections**:
1. Flag Football Game Rules & Structure
2. League Management Concepts
3. Player Eligibility & Pass Checking
4. Game Day Operations
5. League Standings & Statistics
6. Common League Management Requirements
7. Business Logic Examples
8. Domain-Specific Terminology

**Django-Specific Sections**:
- Django apps architecture
- Django models and migrations
- DRF serializers and viewsets
- Django testing patterns

**React-Specific Sections**:
- React component structure
- Redux state management
- Component testing with React Testing Library

### 2. Architecture Designer

**File**: `.claude/agents/architecture-designer.md`

**Key Attributes**:
```yaml
name: architecture-designer
description: Architecture and design specialist for Django/React applications. Reviews requirements and creates high-level system design. Use for complex features requiring architectural planning.
tools: Read, Write, Grep, Glob, WebSearch, TodoWrite
model: sonnet
color: purple
```

**Additional Django Patterns**:
- Django signals for decoupled event handling
- Django middleware for request/response processing
- Django custom managers and querysets
- Django REST Framework nested routes
- Database optimization (select_related, prefetch_related)

**Additional React Patterns**:
- Redux toolkit slices
- React hooks patterns (useState, useEffect, useContext)
- Component composition patterns
- Performance optimization (memo, useMemo, useCallback)

### 3. Implementation Engineer

**File**: `.claude/agents/implementation-engineer.md`

**Key Attributes**:
```yaml
name: implementation-engineer
description: Implementation specialist following SOLID principles and clean code practices with test-first strategy. Supports both Python/Django and JavaScript/React development. Use for writing production-ready code after requirements analysis.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, TodoWrite
model: sonnet
color: green
```

**Test-First Examples**:

**Python/Django**:
```python
# tests/test_game_scheduling.py
import pytest
from gamedays.models import Game, Field
from gamedays.services import GameScheduler

class TestGameScheduler:
    """Test game scheduling service."""

    @pytest.mark.django_db
    def test_detect_field_conflict(self):
        """Test detection of games scheduled on same field at same time."""
        # Arrange
        field = Field.objects.create(name="Field 1")
        game1 = Game.objects.create(
            field=field,
            start_time="2025-01-01 10:00:00"
        )

        # Act
        scheduler = GameScheduler()
        conflicts = scheduler.detect_conflicts(
            field=field,
            start_time="2025-01-01 10:00:00"
        )

        # Assert
        assert len(conflicts) == 1
        assert conflicts[0] == game1
```

**JavaScript/React**:
```javascript
// src/components/__tests__/LiveScoreboard.test.js
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import LiveScoreboard from '../LiveScoreboard';

const mockStore = configureStore([]);

describe('LiveScoreboard', () => {
  test('displays current score', () => {
    // Arrange
    const store = mockStore({
      game: {
        homeScore: 14,
        awayScore: 7
      }
    });

    // Act
    render(
      <Provider store={store}>
        <LiveScoreboard />
      </Provider>
    );

    // Assert
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
```

### 4. QA Engineer

**File**: `.claude/agents/qa-engineer.md`

**Key Attributes**:
```yaml
name: qa-engineer
description: Quality assurance specialist for Python/Django and JavaScript/React. Ensures 100% test success, meeting coverage requirements, and running code quality checks for both backend and frontend.
tools: Read, Grep, Glob, Bash, TodoWrite, Write
model: sonnet
color: red
```

**Test Execution Workflow**:
```markdown
## Complete QA Check Workflow

### Step 1: Backend Testing
```bash
# 1. Setup test database
cd container && ./spinup_test_db.sh

# 2. Run Django tests
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest --cov=. --cov-report=html

# 3. Check Django-specific issues
python manage.py check
python manage.py makemigrations --check --dry-run

# 4. Run Python linter
black --check .
```

### Step 2: Frontend Testing
```bash
# 1. Test passcheck app
npm --prefix passcheck/ test -- --watchAll=false --coverage

# 2. Test liveticker app
npm --prefix liveticker/ run jest --coverage

# 3. Test scorecard app
npm --prefix scorecard/ run jest --coverage

# 4. Run linters
npm --prefix passcheck/ run eslint
npm --prefix liveticker/ run eslint
npm --prefix scorecard/ run eslint
```

### Step 3: Integration Testing
```bash
# Build all React apps
npm --prefix passcheck/ run build
npm --prefix liveticker/ run build
npm --prefix scorecard/ run build

# Collect Django static files
python manage.py collectstatic --noinput

# Test Django serves built React apps correctly
python manage.py runserver
# Manual verification or selenium tests
```
```

**Coverage Requirements**:
- Backend: ~84% statements (current project standard)
- Frontend (each app): ~80% coverage
- Critical paths: 100% coverage (authentication, scoring, eligibility)

### 5. Documentation Specialist

**File**: `.claude/agents/documentation-specialist.md`

**Key Attributes**:
```yaml
name: documentation-specialist
description: Documentation expert for Django/React applications. Creates user guides, API docs, and ensures comprehensive documentation.
tools: Read, Write, Edit, Grep, Glob, TodoWrite
model: sonnet
color: cyan
```

**No major changes from energy.consumption version** - already generic enough.

### 6. Cleanup Coordinator

**File**: `.claude/agents/cleanup-coordinator.md`

**Key Attributes**:
```yaml
name: cleanup-coordinator
description: Workspace hygiene specialist. Ensures working directory contains only PR-relevant files, removes dead code, and redirects misplaced changes.
tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
color: yellow
```

**LeagueSphere-Specific Additions**:
```markdown
## LeagueSphere Safety Checks

### Never Remove Without Verification
- Django migration files (*/migrations/*.py)
- Django models (*/models.py)
- Django admin registrations (*/admin.py)
- API serializers (*/serializers.py)
- React Redux store files (*/store/*.js, */reducers/*.js)
- Webpack configurations (*/webpack.config.js)

### Django-Specific Cleanup
```bash
# Remove Python cache files
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -delete

# Remove Django test databases
find . -name "test_*.db" -delete

# Clean coverage reports
rm -rf htmlcov/ .coverage
```

### React-Specific Cleanup
```bash
# Remove node_modules if accidentally committed
# (should be in .gitignore but check)

# Remove webpack build artifacts
rm -rf passcheck/static/passcheck/js/passcheck.js
rm -rf liveticker/static/liveticker/js/liveticker.js
rm -rf scorecard/static/scorecard/js/scorecard.js

# Remove coverage reports
rm -rf passcheck/coverage/
rm -rf liveticker/coverage/
rm -rf scorecard/coverage/
```
```

### 7. Git Coordinator

**File**: `.claude/agents/git-coordinator.md`

**Key Attributes**:
```yaml
name: git-coordinator
description: Git operations specialist for Django/React projects. Creates conventional commits and pull requests after QA approval.
tools: Bash, Read, Grep, Glob, Write, TodoWrite
model: sonnet
color: orange
```

**LeagueSphere Pre-Commit Checks**:
```markdown
### Phase 2: Pre-Commit Checks

Run automated checks for Django and React:

```bash
# Backend checks
MYSQL_HOST=10.185.182.207 \
MYSQL_DB_NAME=test_db \
MYSQL_USER=user \
MYSQL_PWD=user \
SECRET_KEY=test-secret-key \
pytest --nomigrations --reuse-db

black --check .
python manage.py check

# Frontend checks
npm --prefix liveticker/ run jest
npm --prefix scorecard/ run jest
npm --prefix liveticker/ run eslint
npm --prefix scorecard/ run eslint

# Build verification (optional but recommended)
npm --prefix liveticker/ run build
npm --prefix scorecard/ run build
npm --prefix passcheck/ run build
```

**STOP if any fail**:
- ❌ Python tests failing
- ❌ JavaScript tests failing
- ❌ Django check errors
- ❌ Lint errors (Python or JavaScript)
- ❌ Build failures
```

---

## Testing Strategy

### Unit Testing

**Backend (Django)**:
```python
# Test models
class TestGameModel:
    def test_game_duration_calculation(self):
        """Test game duration is calculated correctly."""
        pass

# Test serializers
class TestGameSerializer:
    def test_serializer_validation(self):
        """Test serializer validates game data."""
        pass

# Test viewsets
class TestGameViewSet:
    def test_list_games(self):
        """Test listing games returns correct data."""
        pass

    def test_create_game_permission(self):
        """Test only authenticated users can create games."""
        pass

# Test services/business logic
class TestSchedulingService:
    def test_detect_scheduling_conflicts(self):
        """Test conflict detection between overlapping games."""
        pass
```

**Frontend (React)**:
```javascript
// Test components
describe('ScoreEntry', () => {
  test('renders score input fields', () => {});
  test('validates score input', () => {});
  test('calls onSubmit with correct data', () => {});
});

// Test Redux reducers
describe('gameReducer', () => {
  test('handles UPDATE_SCORE action', () => {});
  test('handles RESET_GAME action', () => {});
});

// Test Redux actions
describe('gameActions', () => {
  test('updateScore creates correct action', () => {});
});

// Test API integration
describe('gameAPI', () => {
  test('fetchGame makes correct API call', () => {});
});
```

### Integration Testing

**Backend**:
```python
class TestGamedayWorkflow:
    """Test complete gameday workflow."""

    @pytest.mark.django_db
    def test_complete_game_workflow(self):
        """
        Test:
        1. Create game
        2. Check in teams
        3. Verify player eligibility
        4. Record scores
        5. Finalize game
        6. Update standings
        """
        pass
```

**Frontend**:
```javascript
describe('Live Scoring Workflow', () => {
  test('complete scoring flow from kickoff to final', () => {
    // Test user can:
    // 1. Start game
    // 2. Add touchdown
    // 3. Add extra point
    // 4. Update liveticker
    // 5. Finalize score
  });
});
```

### E2E Testing (Optional)

```python
# Using Selenium or Playwright
class TestLiveScoringE2E:
    def test_score_game_end_to_end(self):
        """Test live scoring from login to final score submission."""
        # 1. Login as official
        # 2. Navigate to game
        # 3. Start game
        # 4. Add scores
        # 5. Verify liveticker updates
        # 6. Submit final score
        # 7. Verify standings updated
        pass
```

### Coverage Goals

| Component | Target Coverage | Critical Paths |
|-----------|----------------|----------------|
| Django Models | 90%+ | Player eligibility, scoring calculations |
| Django Views/ViewSets | 85%+ | API endpoints, permissions |
| Django Services | 95%+ | Business logic, scheduling algorithms |
| React Components | 80%+ | User inputs, score entry |
| Redux Reducers | 95%+ | State management |
| Redux Actions | 85%+ | API calls, side effects |

---

## Success Criteria

### Agent Adoption Success

✅ **Phase 1 Complete** when:
- All 7 agents created in `.claude/agents/`
- Requirements analyst includes flag football domain knowledge
- All agents adapted for Django/React
- AGENT_WORKFLOW_SETUP.md created
- CLAUDE.md updated with agent workflow section

✅ **Phase 2 Complete** when:
- Requirements analyst generates comprehensive requirements.md
- Architecture designer produces Django/React architecture.md
- Implementation engineer writes both Python and JavaScript tests
- QA engineer successfully runs all tests (Python + JavaScript)
- Documentation specialist creates user-guide.md
- Cleanup coordinator produces cleanup-report.md
- Git coordinator creates properly formatted commits and PRs

✅ **Phase 3 Complete** when:
- One complete feature implemented using full workflow
- All quality gates passed
- Documentation complete
- PR created and merged
- Lessons learned documented

### Quality Metrics

**Test Coverage**:
- Backend: ≥84% statements (maintain current standard)
- Frontend: ≥80% per app
- Critical paths: 100%

**Code Quality**:
- Zero critical lint errors
- Zero high-severity security vulnerabilities
- SOLID principles applied
- Clean code practices followed

**Documentation**:
- requirements.md for all features
- architecture.md for complex features
- implementation-notes.md always created
- user-guide.md for user-facing features
- api-documentation.md for API features

**Agent Performance**:
- Requirements analysis: <10 minutes
- Architecture design: <15 minutes
- Implementation: Variable (based on feature size)
- QA checks: <5 minutes
- Documentation: <10 minutes
- Cleanup: <5 minutes
- Git operations: <2 minutes

---

## Timeline

| Week | Phase | Activities | Deliverables |
|------|-------|-----------|--------------|
| 1 | Agent Creation | Create and adapt all 7 agents | 7 agent .md files |
| 1-2 | Documentation | Create setup guide, update CLAUDE.md | AGENT_WORKFLOW_SETUP.md, updated CLAUDE.md |
| 2 | Testing | Test each agent individually | Test reports, refinement notes |
| 2 | Validation | Run sample feature through workflow | Sample feature-dev/ directory |
| 2-3 | Refinement | Gather feedback, improve agents | Updated agent files |
| 3 | Production | Implement real feature with workflow | Complete feature with docs |
| 3 | Documentation | Document lessons learned | Final report, examples |

---

## Appendix A: Flag Football Domain Resources

### Rules References
- USFTL (United States Flag Touch League) Rules
- NFL FLAG Rules
- NIRSA Flag Football Rules (college intramurals)
- Local league-specific rules

### League Management Best Practices
- Scheduling algorithms (round-robin, divisional)
- Playoff bracket generation
- Tiebreaker rules
- Player eligibility verification
- Official assignment algorithms

### Common Feature Requests
1. Automated bracket generation
2. Live score updates
3. Player statistics tracking
4. Team roster management
5. Schedule conflict detection
6. Referee assignment optimization
7. Multi-division standings
8. Season-long statistics
9. MVP/awards tracking
10. Weather/field status updates

---

## Appendix B: LeagueSphere-Specific Patterns

### Django Patterns

**Model Pattern**:
```python
# gamedays/models.py
from django.db import models

class Game(models.Model):
    """Represents a single game in the league."""

    home_team = models.ForeignKey('Team', related_name='home_games')
    away_team = models.ForeignKey('Team', related_name='away_games')
    field = models.ForeignKey('Field', related_name='games')
    start_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)

    home_score = models.IntegerField(default=0)
    away_score = models.IntegerField(default=0)

    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['start_time', 'field']),
        ]

    def clean(self):
        """Validate game data."""
        if self.home_team == self.away_team:
            raise ValidationError("Team cannot play itself")
```

**DRF Serializer Pattern**:
```python
# gamedays/serializers.py
from rest_framework import serializers
from .models import Game

class GameSerializer(serializers.ModelSerializer):
    """Serializer for Game model."""

    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)

    class Meta:
        model = Game
        fields = ['id', 'home_team', 'away_team', 'home_team_name',
                  'away_team_name', 'field', 'start_time', 'status',
                  'home_score', 'away_score']

    def validate(self, data):
        """Validate game data."""
        if data.get('home_team') == data.get('away_team'):
            raise serializers.ValidationError("Team cannot play itself")
        return data
```

**DRF ViewSet Pattern**:
```python
# gamedays/views.py
from rest_framework import viewsets, permissions
from .models import Game
from .serializers import GameSerializer

class GameViewSet(viewsets.ModelViewSet):
    """ViewSet for Game CRUD operations."""

    queryset = Game.objects.select_related('home_team', 'away_team', 'field')
    serializer_class = GameSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """Filter games by query parameters."""
        queryset = super().get_queryset()

        team_id = self.request.query_params.get('team')
        if team_id:
            queryset = queryset.filter(
                Q(home_team_id=team_id) | Q(away_team_id=team_id)
            )

        return queryset
```

### React/Redux Patterns

**Redux Slice Pattern** (liveticker, scorecard):
```javascript
// src/store/gameSlice.js
import { createSlice } from '@reduxjs/toolkit';

const gameSlice = createSlice({
  name: 'game',
  initialState: {
    currentGame: null,
    homeScore: 0,
    awayScore: 0,
    plays: [],
    loading: false,
    error: null
  },
  reducers: {
    setGame(state, action) {
      state.currentGame = action.payload;
    },
    updateScore(state, action) {
      const { team, points } = action.payload;
      if (team === 'home') {
        state.homeScore += points;
      } else {
        state.awayScore += points;
      }
    },
    addPlay(state, action) {
      state.plays.push(action.payload);
    }
  }
});

export const { setGame, updateScore, addPlay } = gameSlice.actions;
export default gameSlice.reducer;
```

**React Component Pattern**:
```javascript
// src/components/ScoreEntry.jsx
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateScore, addPlay } from '../store/gameSlice';

const ScoreEntry = ({ team }) => {
  const dispatch = useDispatch();
  const [playDescription, setPlayDescription] = useState('');

  const handleTouchdown = () => {
    dispatch(updateScore({ team, points: 6 }));
    dispatch(addPlay({
      type: 'TD',
      team,
      description: playDescription,
      points: 6,
      timestamp: new Date().toISOString()
    }));
    setPlayDescription('');
  };

  const handleExtraPoint = () => {
    dispatch(updateScore({ team, points: 1 }));
    dispatch(addPlay({
      type: 'XP',
      team,
      description: 'Extra point',
      points: 1,
      timestamp: new Date().toISOString()
    }));
  };

  return (
    <div className="score-entry">
      <input
        value={playDescription}
        onChange={(e) => setPlayDescription(e.target.value)}
        placeholder="Describe the play..."
      />
      <button onClick={handleTouchdown}>Touchdown (6)</button>
      <button onClick={handleExtraPoint}>Extra Point (1)</button>
    </div>
  );
};

export default ScoreEntry;
```

---

## Appendix C: Example Feature Flow

### Feature: "Add Game Scheduling Conflict Detection"

**Step 1: Requirements Analysis**
```
User: I need to detect when games are scheduled on the same field at the same time,
or when the same team is scheduled for two games at overlapping times. Alert the
scheduler before the game is created.
```

**Requirements Analyst Output**:
`feature-dev/scheduling-conflicts/requirements.md`:
```markdown
# Requirements Specification: Game Scheduling Conflict Detection

## Overview
Implement conflict detection for game scheduling to prevent:
1. Multiple games on the same field at overlapping times
2. Same team scheduled for overlapping games

## Flag Football Domain Context
- Games typically last 1 hour (can vary by league)
- Fields can be shared but not at the same time
- Teams need travel time between games at different fields
- Officials need assignments that don't overlap

## Functional Requirements

### FR-001: Field Conflict Detection
Detect when a new game is scheduled on a field that already has a game at an overlapping time.

**Acceptance Criteria**:
- Given a field and time slot
- When a game already exists on that field within ±30 minutes
- Then system should flag as field conflict

**Priority**: High

### FR-002: Team Conflict Detection
Detect when a team is scheduled for multiple games at overlapping times.

**Acceptance Criteria**:
- Given a team and time slot
- When the team already has a game within ±2 hours
- Then system should flag as team conflict

**Priority**: High

[... more requirements ...]
```

**Step 2: Architecture Design**
`feature-dev/scheduling-conflicts/architecture.md`:
```markdown
# Architecture Design: Game Scheduling Conflict Detection

## System Design

### Django Service Layer
Create `SchedulingConflictDetector` service:

```python
class SchedulingConflictDetector:
    def detect_conflicts(self, game_data):
        """Detect all conflicts for a proposed game."""
        conflicts = []
        conflicts.extend(self._check_field_conflicts(game_data))
        conflicts.extend(self._check_team_conflicts(game_data))
        return conflicts
```

### DRF Validation
Add validation to GameSerializer:

```python
class GameSerializer(serializers.ModelSerializer):
    def validate(self, data):
        detector = SchedulingConflictDetector()
        conflicts = detector.detect_conflicts(data)
        if conflicts:
            raise serializers.ValidationError({
                'conflicts': conflicts
            })
        return data
```

[... more architecture details ...]
```

**Step 3: Implementation**

Tests first:
```python
# tests/test_scheduling_conflicts.py
class TestSchedulingConflictDetector:
    @pytest.mark.django_db
    def test_detects_field_conflict(self):
        # Arrange
        field = FieldFactory()
        existing_game = GameFactory(
            field=field,
            start_time="2025-01-01 10:00:00"
        )

        # Act
        detector = SchedulingConflictDetector()
        conflicts = detector.detect_conflicts({
            'field': field,
            'start_time': "2025-01-01 10:15:00"
        })

        # Assert
        assert len(conflicts) > 0
        assert conflicts[0]['type'] == 'field_conflict'
```

Then implementation:
```python
# gamedays/services/scheduling.py
class SchedulingConflictDetector:
    def _check_field_conflicts(self, game_data):
        """Check for field scheduling conflicts."""
        field = game_data['field']
        start_time = game_data['start_time']

        # Check ±30 minute window
        time_window_start = start_time - timedelta(minutes=30)
        time_window_end = start_time + timedelta(minutes=30)

        conflicts = Game.objects.filter(
            field=field,
            start_time__range=(time_window_start, time_window_end)
        ).exclude(id=game_data.get('id'))

        return [
            {
                'type': 'field_conflict',
                'message': f'Field {field.name} already has game at this time',
                'conflicting_game': game.id
            }
            for game in conflicts
        ]
```

**Step 4: QA Verification**
```bash
# Run tests
pytest tests/test_scheduling_conflicts.py -v

# Check coverage
pytest tests/test_scheduling_conflicts.py --cov=gamedays.services.scheduling

# Lint
black gamedays/services/scheduling.py
```

**Step 5: Documentation**
`feature-dev/scheduling-conflicts/user-guide.md`:
```markdown
# Game Scheduling Conflict Detection - User Guide

## Overview
The system automatically detects scheduling conflicts when creating or editing games.

## How It Works

### Field Conflicts
When you schedule a game, the system checks if the field is available:
- Checks ±30 minutes around the scheduled time
- Alerts you if another game is scheduled

### Team Conflicts
The system prevents teams from being double-booked:
- Checks ±2 hours around the scheduled time
- Ensures teams have time to travel between games

## Using the Feature

1. Navigate to "Create Game"
2. Select teams, field, and time
3. Click "Check for Conflicts"
4. Review any conflicts shown
5. Adjust time or field if needed
6. Save game when no conflicts exist

[... more user documentation ...]
```

**Step 6-8: Cleanup, Git Operations**
- Cleanup coordinator removes any debug code
- Git coordinator creates commit and PR
- PR description includes all feature-dev/ documentation

---

## Next Steps

1. **Review this plan** with the team
2. **Approve adaptations** for LeagueSphere
3. **Create agents** following Phase 1
4. **Test workflow** with a small feature
5. **Refine** based on feedback
6. **Scale up** to more complex features
7. **Document** lessons learned

---

**Document Version**: 1.0
**Created**: 2025-01-06
**Author**: Claude (Sonnet 4.5) via agent workflow analysis
**Status**: Draft - Pending Review
