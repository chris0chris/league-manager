# Game Results Entry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a game results entry interface in the gameday_designer that allows users to enter scores for all games in a gameday, with automatic resolution of bracket references (e.g., "Winner of Game 1").

**Architecture:** 
- Backend: New API serializer and viewset endpoints for game results, plus a bracket resolution service.
- Frontend: New React component `GameResultsTable` in gameday_designer that displays all games with inline editable score fields.
- State: Extend `GamedayContext` to track results input state and validation.
- Data Flow: Games → Results Input → Bracket Resolution Validation → Persistence.

**Tech Stack:** 
- Backend: Django 5.2, DRF, pytest.
- Frontend: React, TypeScript, React Bootstrap, Vitest.

---

### Task 1: Bracket Resolution Service

**Files:**
- Create: `gamedays/service/bracket_resolution.py`
- Create: `gamedays/tests/service/test_bracket_resolution.py`

**Step 1: Write the failing test**

```python
import pytest
from gamedays.models import Gameday, Gameinfo, Gameresult, Team, Season, League
from gamedays.service.bracket_resolution import BracketResolutionService
from datetime import date
from django.contrib.auth.models import User

@pytest.mark.django_db
class TestBracketResolutionService:
    def setup_method(self):
        self.user = User.objects.create_user(username="test", password="test")
        self.season = Season.objects.create(name="2026")
        self.league = League.objects.create(name="Test")
        self.team_a = Team.objects.create(name="Team A", description="A", location="City")
        self.team_b = Team.objects.create(name="Team B", description="B", location="City")
        self.team_c = Team.objects.create(name="Team C", description="C", location="City")
        self.gameday = Gameday.objects.create(
            name="Test", season=self.season, league=self.league,
            date=date(2026, 2, 3), start="10:00", author=self.user
        )
        self.game1 = Gameinfo.objects.create(
            gameday=self.gameday, scheduled="10:00", field=1,
            officials=self.team_a, stage="Group", standing="Final"
        )
        self.game2 = Gameinfo.objects.create(
            gameday=self.gameday, scheduled="11:00", field=1,
            officials=self.team_a, stage="Semi", standing="Final"
        )
        Gameresult.objects.create(gameinfo=self.game1, team=self.team_a, isHome=True)
        Gameresult.objects.create(gameinfo=self.game1, team=self.team_b, isHome=False)
        Gameresult.objects.create(gameinfo=self.game2, team=None, isHome=True)
        Gameresult.objects.create(gameinfo=self.game2, team=self.team_c, isHome=False)

    def test_resolve_winner_reference(self):
        service = BracketResolutionService()
        home = Gameresult.objects.get(gameinfo=self.game1, isHome=True)
        away = Gameresult.objects.get(gameinfo=self.game1, isHome=False)
        home.fh, home.sh = 2, 1
        home.save()
        away.fh, away.sh = 1, 0
        away.save()
        resolved = service.resolve_winner_reference(game_id=self.game1.id, gameday=self.gameday)
        assert resolved == self.team_a

    def test_get_unresolved_references(self):
        service = BracketResolutionService()
        unresolved = service.get_unresolved_references(gameday=self.gameday)
        assert self.game2.id in [g.id for g in unresolved]
```

**Step 2: Run test to verify it fails**

Run: `pytest gamedays/tests/service/test_bracket_resolution.py -v`
Expected: ModuleNotFoundError: No module named 'gamedays.service.bracket_resolution'

**Step 3: Write minimal implementation**

```python
from typing import Optional, List
from gamedays.models import Gameday, Gameinfo, Gameresult, Team

class BracketResolutionService:
    def resolve_winner_reference(self, game_id: int, gameday: Gameday) -> Optional[Team]:
        try:
            game = Gameinfo.objects.get(gameday=gameday, id=game_id)
        except Gameinfo.DoesNotExist:
            raise ValueError(f"Game {game_id} not found")
        results = Gameresult.objects.filter(gameinfo=game)
        if not results.exists():
            raise ValueError(f"No results for game {game_id}")
        home = results.get(isHome=True)
        away = results.get(isHome=False)
        if home.fh is None or away.fh is None:
            raise ValueError(f"Game {game_id} result incomplete")
        if (home.fh + home.sh) > (away.fh + away.sh):
            return home.team
        elif (away.fh + away.sh) > (home.fh + home.sh):
            return away.team
        raise ValueError(f"Game {game_id} ended in a draw")

    def get_unresolved_references(self, gameday: Gameday) -> List[Gameinfo]:
        return list(Gameinfo.objects.filter(gameday=gameday, gameresult__team__isnull=True).distinct())
```

**Step 4: Run test to verify it passes**

Run: `pytest gamedays/tests/service/test_bracket_resolution.py -v`
Expected: 2 passed

**Step 5: Commit**

```bash
git add gamedays/service/bracket_resolution.py gamedays/tests/service/test_bracket_resolution.py
git commit -m "feat: add bracket resolution service"
```

---

### Task 2: Game Results API

**Files:**
- Create: `gamedays/serializers/game_results.py`
- Modify: `gamedays/views.py`
- Create: `gamedays/tests/api/test_game_results_api.py`

**Step 1: Write the failing test**

```python
import pytest
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from gamedays.models import Gameday, Gameinfo, Gameresult, Team, Season, League
from datetime import date

class GameResultsAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username="admin", password="password")
        self.client.force_authenticate(user=self.user)
        self.season = Season.objects.create(name="2026")
        self.league = League.objects.create(name="Test")
        self.team_a = Team.objects.create(name="Team A")
        self.team_b = Team.objects.create(name="Team B")
        self.gameday = Gameday.objects.create(
            name="Test", season=self.season, league=self.league,
            date=date(2026, 2, 3), start="10:00", author=self.user
        )
        self.game = Gameinfo.objects.create(gameday=self.gameday, scheduled="10:00", field=1)
        Gameresult.objects.create(gameinfo=self.game, team=self.team_a, isHome=True)
        Gameresult.objects.create(gameinfo=self.game, team=self.team_b, isHome=False)

    def test_get_gameday_games(self):
        url = f"/api/gamedays/{self.gameday.id}/games/"
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_update_game_result(self):
        url = f"/api/gamedays/{self.gameday.id}/games/{self.game.id}/results/"
        data = {"results": [
            {"team_id": self.team_a.id, "fh": 2, "sh": 1, "isHome": True},
            {"team_id": self.team_b.id, "fh": 1, "sh": 0, "isHome": False}
        ]}
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
```

**Step 2: Run test to verify it fails**

Run: `pytest gamedays/tests/api/test_game_results_api.py -v`
Expected: 404 Not Found

**Step 3: Write minimal implementation**

```python
# gamedays/serializers/game_results.py
from rest_framework import serializers
from gamedays.models import Gameresult, Gameinfo

class GameResultSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    class Meta:
        model = Gameresult
        fields = ['id', 'team_id', 'team_name', 'fh', 'sh', 'pa', 'isHome']

class GameResultsUpdateSerializer(serializers.Serializer):
    results = GameResultSerializer(many=True)
    def update(self, instance, validated_data):
        for res_data in validated_data['results']:
            res = Gameresult.objects.get(gameinfo=instance, isHome=res_data['isHome'])
            res.fh, res.sh, res.pa = res_data.get('fh'), res_data.get('sh'), res_data.get('pa')
            res.save()
        return instance
```

Add routes to `gamedays/urls.py` and view methods to `gamedays/views.py`.

**Step 4: Run test to verify it passes**

Run: `pytest gamedays/tests/api/test_game_results_api.py -v`
Expected: 2 passed

**Step 5: Commit**

```bash
git add gamedays/serializers/game_results.py gamedays/views.py gamedays/tests/api/test_game_results_api.py
git commit -m "feat: add game results API"
```

---

### Task 3: Game Results Table Component

**Files:**
- Create: `gameday_designer/src/components/GameResultsTable.tsx`
- Create: `gameday_designer/src/components/__tests__/GameResultsTable.test.tsx`
- Modify: `gameday_designer/src/types/designer.ts`

**Step 1: Write the failing test**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameResultsTable } from '../GameResultsTable';

describe('GameResultsTable', () => {
  const mockGames = [{
    id: 1, field: 1, scheduled: '10:00',
    results: [
      { id: 1, team: { id: 1, name: 'Team A' }, fh: null, sh: null, isHome: true },
      { id: 2, team: { id: 2, name: 'Team B' }, fh: null, sh: null, isHome: false }
    ]
  }];

  it('renders table', () => {
    render(<GameResultsTable games={mockGames} onSave={async () => {}} />);
    expect(screen.getByText('Team A')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix gameday_designer run test:run -- src/components/__tests__/GameResultsTable.test.tsx`
Expected: FAIL (Component missing)

**Step 3: Write minimal implementation**

(Implementation as provided in draft plan)

**Step 4: Run test to verify it passes**

Run: `npm --prefix gameday_designer run test:run -- src/components/__tests__/GameResultsTable.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add gameday_designer/src/components/GameResultsTable.tsx gameday_designer/src/components/__tests__/GameResultsTable.test.tsx
git commit -m "feat: add GameResultsTable component"
```

---

### Task 4: Integrate into Designer Canvas

**Files:**
- Modify: `gameday_designer/src/context/GamedayContext.tsx`
- Modify: `gameday_designer/src/components/DesignerCanvas.tsx`

**Step 1: Update GamedayContext state**

Add `resultsMode` and `gameResults` to context.

**Step 2: Update DesignerCanvas UI**

Toggle between Flow view and Results view based on `resultsMode`.

**Step 3: Run frontend tests**

Run: `npm --prefix gameday_designer run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add gameday_designer/src/context/GamedayContext.tsx gameday_designer/src/components/DesignerCanvas.tsx
git commit -m "feat: integrate results mode into designer canvas"
```

---

### Task 5: Verification & E2E

**Step 1: Run full test suite**

Run: `pytest && npm --prefix gameday_designer run test:run`

**Step 2: Manual verification on staging**

Deploy to staging and verify workflow.

**Step 3: Final Commit & PR**

```bash
git push origin <branch>
gh pr create --title "feat: game results entry in designer" --body "Implements game results entry with bracket resolution."
```
