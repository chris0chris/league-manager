# Game Results Entry Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a game results entry interface in the gameday_designer that allows users to enter scores for all games in a gameday, with automatic resolution of bracket references (e.g., "Winner of Game 1").

**Architecture:** 
- Backend: New API serializer and viewset endpoints for game results, plus a bracket resolution service
- Frontend: New React component `GameResultsTable` in gameday_designer that displays all games with inline editable score fields
- State: Extend GamedayContext to track results input state and validation
- Data Flow: Games → Results Input → Bracket Resolution Validation → Persistence

**Tech Stack:** 
- Backend: Django REST Framework, Python service layer for bracket resolution
- Frontend: React, TypeScript, React Bootstrap for UI
- Testing: pytest for backend, Vitest for frontend

---

## Task 1: Write backend test for bracket resolution service

**Files:**
- Create: `gamedays/tests/service/test_bracket_resolution.py`
- Create: `gamedays/service/bracket_resolution.py`

**Step 1: Write the failing test**

Create `gamedays/tests/service/test_bracket_resolution.py`:

```python
import pytest
from gamedays.models import Gameday, Gameinfo, Gameresult, Team, Season, League
from gamedays.service.bracket_resolution import BracketResolutionService
from datetime import date
from django.contrib.auth.models import User

@pytest.mark.django_db
class TestBracketResolutionService:
    """Test bracket reference resolution when game results are entered"""
    
    def setup_method(self):
        """Create test fixtures"""
        self.user = User.objects.create_user(username="test", password="test")
        self.season = Season.objects.create(name="2026")
        self.league = League.objects.create(name="Test")
        
        self.team_a = Team.objects.create(name="Team A", description="Team A Desc", location="City")
        self.team_b = Team.objects.create(name="Team B", description="Team B Desc", location="City")
        self.team_c = Team.objects.create(name="Team C", description="Team C Desc", location="City")
        self.team_d = Team.objects.create(name="Team D", description="Team D Desc", location="City")
        
        self.gameday = Gameday.objects.create(
            name="Test",
            season=self.season,
            league=self.league,
            date=date(2026, 2, 3),
            start="10:00",
            author=self.user
        )
        
        # Create a simple bracket: 
        # Game 1: Team A vs Team B
        # Game 2: "Winner of Game 1" vs Team C
        self.game1 = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="10:00",
            field=1,
            officials=self.team_a,
            stage="Group",
            standing="Final"
        )
        
        self.game2 = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="11:00",
            field=1,
            officials=self.team_a,
            stage="Semi",
            standing="Final"
        )
        
        # Create results for game 1
        Gameresult.objects.create(gameinfo=self.game1, team=self.team_a, isHome=True)
        Gameresult.objects.create(gameinfo=self.game1, team=self.team_b, isHome=False)
        
        # Game 2 has a bracket reference (will be resolved after game 1 result)
        Gameresult.objects.create(gameinfo=self.game2, team=None, isHome=True, pa=None)  # "Winner of Game 1"
        Gameresult.objects.create(gameinfo=self.game2, team=self.team_c, isHome=False)
    
    def test_resolve_bracket_reference_winner(self):
        """Test resolving 'Winner of Game X' reference"""
        service = BracketResolutionService()
        
        # Enter result for game 1: Team A wins 3-1
        home_result = Gameresult.objects.get(gameinfo=self.game1, isHome=True)
        away_result = Gameresult.objects.get(gameinfo=self.game1, isHome=False)
        home_result.fh = 2
        home_result.sh = 1
        home_result.save()
        away_result.fh = 1
        away_result.sh = 0
        away_result.save()
        
        # Resolve bracket references for game 2
        resolved_team = service.resolve_winner_reference(game_id=1, gameday=self.gameday)
        
        assert resolved_team == self.team_a
    
    def test_cannot_resolve_when_result_missing(self):
        """Test that resolution fails gracefully when result not yet entered"""
        service = BracketResolutionService()
        
        # Try to resolve without entering game 1 result
        with pytest.raises(ValueError, match="Cannot resolve"):
            service.resolve_winner_reference(game_id=1, gameday=self.gameday)
    
    def test_get_unresolved_bracket_references(self):
        """Test identifying which games have unresolved bracket references"""
        service = BracketResolutionService()
        
        # Game 2 should have unresolved references
        unresolved = service.get_unresolved_references(gameday=self.gameday)
        
        assert self.game2.id in [g.id for g in unresolved]
```

**Step 2: Run test to verify it fails**

```bash
cd /home/cda/.local/share/opencode/worktree/212c86dfb0b9deb465f3caef8df4dfea2290e45d/tidy-otter/.worktrees/feat-gameday-results
pytest gamedays/tests/service/test_bracket_resolution.py -v
```

Expected output:
```
ModuleNotFoundError: No module named 'gamedays.service.bracket_resolution'
```

**Step 3: Write minimal implementation**

Create `gamedays/service/bracket_resolution.py`:

```python
from typing import Optional, List
from gamedays.models import Gameday, Gameinfo, Gameresult, Team

class BracketResolutionService:
    """Service for resolving bracket references in tournament games"""
    
    def resolve_winner_reference(self, game_id: int, gameday: Gameday) -> Optional[Team]:
        """
        Resolve a 'Winner of Game X' reference to the actual team.
        
        Args:
            game_id: The source game ID
            gameday: The gameday containing the game
        
        Returns:
            The winning team from the referenced game
        
        Raises:
            ValueError: If the game result is not yet entered
        """
        try:
            game = Gameinfo.objects.get(gameday=gameday, id=game_id)
        except Gameinfo.DoesNotExist:
            raise ValueError(f"Game {game_id} not found")
        
        results = Gameresult.objects.filter(gameinfo=game)
        if not results.exists():
            raise ValueError(f"Cannot resolve: Game {game_id} has no results entered")
        
        # Find which team won (higher total score)
        home_result = results.get(isHome=True)
        away_result = results.get(isHome=False)
        
        if home_result.fh is None or away_result.fh is None:
            raise ValueError(f"Cannot resolve: Game {game_id} result incomplete")
        
        home_total = (home_result.fh or 0) + (home_result.sh or 0)
        away_total = (away_result.fh or 0) + (away_result.sh or 0)
        
        if home_total > away_total:
            return home_result.team
        elif away_total > home_total:
            return away_result.team
        else:
            # Handle draw case - could use away team or raise error
            raise ValueError(f"Cannot resolve: Game {game_id} ended in a draw")
    
    def get_unresolved_references(self, gameday: Gameday) -> List[Gameinfo]:
        """
        Get all games that have unresolved bracket references.
        
        Args:
            gameday: The gameday to check
        
        Returns:
            List of games with unresolved references
        """
        # For MVP: return games where a result team is None (indicates bracket ref)
        unresolved_games = []
        games = Gameinfo.objects.filter(gameday=gameday)
        
        for game in games:
            results = Gameresult.objects.filter(gameinfo=game)
            for result in results:
                if result.team is None:
                    unresolved_games.append(game)
                    break
        
        return unresolved_games
```

**Step 4: Run test to verify it passes**

```bash
pytest gamedays/tests/service/test_bracket_resolution.py -v
```

Expected output:
```
test_resolve_bracket_reference_winner PASSED
test_cannot_resolve_when_result_missing PASSED
test_get_unresolved_bracket_references PASSED
```

**Step 5: Commit**

```bash
git add gamedays/service/bracket_resolution.py gamedays/tests/service/test_bracket_resolution.py
git commit -m "feat: add bracket resolution service for tournament games"
```

---

## Task 2: Write backend API serializer and viewset for game results

**Files:**
- Create: `gamedays/serializers/game_results.py`
- Modify: `gamedays/views.py` (add GameResultsViewSet)
- Create: `gamedays/tests/api/test_game_results_api.py`

**Step 1: Write the failing test**

Create `gamedays/tests/api/test_game_results_api.py`:

```python
import pytest
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from gamedays.models import Gameday, Gameinfo, Gameresult, Team, Season, League
from datetime import date

class GameResultsAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="admin", password="password", email="admin@test.com"
        )
        self.client.force_authenticate(user=self.user)
        
        self.season = Season.objects.create(name="2026")
        self.league = League.objects.create(name="Test")
        
        self.team_a = Team.objects.create(name="Team A", description="Desc A", location="City")
        self.team_b = Team.objects.create(name="Team B", description="Desc B", location="City")
        
        self.gameday = Gameday.objects.create(
            name="Test Gameday",
            season=self.season,
            league=self.league,
            date=date(2026, 2, 3),
            start="10:00",
            author=self.user,
            status="PUBLISHED"
        )
        
        self.gameinfo = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="10:00",
            field=1,
            officials=self.team_a,
            stage="Group",
            standing="Final"
        )
        
        Gameresult.objects.create(gameinfo=self.gameinfo, team=self.team_a, isHome=True)
        Gameresult.objects.create(gameinfo=self.gameinfo, team=self.team_b, isHome=False)
    
    def test_get_gameday_results(self):
        """Test retrieving all games for a gameday"""
        url = f"/api/gamedays/{self.gameday.id}/games/"
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["field"] == 1
    
    def test_update_game_result(self):
        """Test updating scores for a game"""
        url = f"/api/gamedays/{self.gameday.id}/games/{self.gameinfo.id}/results/"
        data = {
            "results": [
                {"team_id": self.team_a.id, "fh": 2, "sh": 1, "isHome": True},
                {"team_id": self.team_b.id, "fh": 1, "sh": 0, "isHome": False}
            ]
        }
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        
        # Verify saved
        self.gameinfo.refresh_from_db()
        home_result = Gameresult.objects.get(gameinfo=self.gameinfo, isHome=True)
        assert home_result.fh == 2
        assert home_result.sh == 1
    
    def test_cannot_update_locked_game(self):
        """Test that locked games cannot be updated"""
        self.gameinfo.is_locked = True
        self.gameinfo.save()
        
        url = f"/api/gamedays/{self.gameday.id}/games/{self.gameinfo.id}/results/"
        data = {
            "results": [
                {"team_id": self.team_a.id, "fh": 2, "sh": 1, "isHome": True},
            ]
        }
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
```

**Step 2: Run test to verify it fails**

```bash
pytest gamedays/tests/api/test_game_results_api.py::GameResultsAPITest::test_get_gameday_results -v
```

Expected output:
```
404 Not Found
```

**Step 3: Write minimal implementation**

Create `gamedays/serializers/game_results.py`:

```python
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
        results_data = validated_data.get('results', [])
        for result_data in results_data:
            try:
                result = Gameresult.objects.get(
                    gameinfo=instance,
                    isHome=result_data['isHome']
                )
                result.fh = result_data.get('fh', result.fh)
                result.sh = result_data.get('sh', result.sh)
                result.pa = result_data.get('pa', result.pa)
                result.save()
            except Gameresult.DoesNotExist:
                pass
        return instance
```

Add to `gamedays/views.py`:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from gamedays.models import Gameday, Gameinfo
from gamedays.serializers.game_results import GameResultSerializer, GameResultsUpdateSerializer

class GameResultsViewSet(viewsets.ViewSet):
    """API for managing game results"""
    
    def list_gameday_games(self, request, gameday_pk=None):
        """GET /api/gamedays/{gameday_id}/games/"""
        gameday = Gameday.objects.get(pk=gameday_pk)
        games = Gameinfo.objects.filter(gameday=gameday)
        serializer = GameInfoSerializer(games, many=True)
        return Response(serializer.data)
    
    def update_game_results(self, request, gameday_pk=None, game_pk=None):
        """POST /api/gamedays/{gameday_id}/games/{game_id}/results/"""
        try:
            game = Gameinfo.objects.get(pk=game_pk, gameday_id=gameday_pk)
        except Gameinfo.DoesNotExist:
            return Response(
                {"error": "Game not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if game.is_locked:
            return Response(
                {"error": "Game is locked"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = GameResultsUpdateSerializer(game, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**Step 4: Run test to verify it passes**

```bash
pytest gamedays/tests/api/test_game_results_api.py -v
```

**Step 5: Commit**

```bash
git add gamedays/serializers/game_results.py gamedays/views.py gamedays/tests/api/test_game_results_api.py
git commit -m "feat: add game results API endpoints"
```

---

## Task 3: Create React component for game results table with inline editing

**Files:**
- Create: `gameday_designer/src/components/GameResultsTable.tsx`
- Create: `gameday_designer/src/components/__tests__/GameResultsTable.test.tsx`
- Modify: `gameday_designer/src/types/designer.ts` (add game result types)

**Step 1: Write the failing test**

Create `gameday_designer/src/components/__tests__/GameResultsTable.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameResultsTable } from '../GameResultsTable';

describe('GameResultsTable', () => {
  const mockGames = [
    {
      id: 1,
      field: 1,
      scheduled: '10:00',
      status: 'PUBLISHED',
      results: [
        { id: 1, team: { id: 1, name: 'Team A' }, fh: null, sh: null, isHome: true },
        { id: 2, team: { id: 2, name: 'Team B' }, fh: null, sh: null, isHome: false }
      ]
    }
  ];

  it('renders game table with teams', () => {
    render(<GameResultsTable games={mockGames} onSave={jest.fn()} />);
    expect(screen.getByText('Team A')).toBeInTheDocument();
    expect(screen.getByText('Team B')).toBeInTheDocument();
  });

  it('allows editing first half score', async () => {
    const onSave = jest.fn();
    const { container } = render(
      <GameResultsTable games={mockGames} onSave={onSave} />
    );

    const inputs = container.querySelectorAll('input[type="number"]');
    const firstHalfInput = inputs[0];

    await userEvent.clear(firstHalfInput);
    await userEvent.type(firstHalfInput, '2');

    expect(firstHalfInput).toHaveValue(2);
  });

  it('calls onSave when scores are committed', async () => {
    const onSave = jest.fn();
    const { container } = render(
      <GameResultsTable games={mockGames} onSave={onSave} />
    );

    const saveButton = screen.getByText(/Save Results/i);
    await userEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it('shows validation error for incomplete scores', async () => {
    const onSave = jest.fn();
    const { container } = render(
      <GameResultsTable games={mockGames} onSave={onSave} />
    );

    const inputs = container.querySelectorAll('input[type="number"]');
    await userEvent.type(inputs[0], '2');
    // Only first half entered, not second half

    const saveButton = screen.getByText(/Save Results/i);
    await userEvent.click(saveButton);

    expect(screen.getByText(/Enter both halves/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm --prefix gameday_designer run test:run -- src/components/__tests__/GameResultsTable.test.tsx
```

Expected: Component not found

**Step 3: Write minimal implementation**

Add types to `gameday_designer/src/types/designer.ts`:

```typescript
export interface GameResultInput {
  id: number;
  team: { id: number; name: string };
  fh: number | null;
  sh: number | null;
  isHome: boolean;
}

export interface GameResultsDisplay {
  id: number;
  field: number;
  scheduled: string;
  status: string;
  results: GameResultInput[];
}
```

Create `gameday_designer/src/components/GameResultsTable.tsx`:

```typescript
import React, { useState } from 'react';
import { Table, Button, Form, Alert } from 'react-bootstrap';
import { GameResultsDisplay } from '../types/designer';

interface GameResultsTableProps {
  games: GameResultsDisplay[];
  onSave: (results: any) => Promise<void>;
}

export const GameResultsTable: React.FC<GameResultsTableProps> = ({
  games,
  onSave,
}) => {
  const [edits, setEdits] = useState<Record<number, any>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleScoreChange = (gameId: number, resultId: number, field: 'fh' | 'sh', value: string) => {
    const key = `${gameId}-${resultId}`;
    setEdits({
      ...edits,
      [key]: {
        ...edits[key],
        [field]: value ? parseInt(value) : null,
      },
    });
  };

  const validateScores = (): boolean => {
    const newErrors: string[] = [];
    
    games.forEach((game) => {
      game.results.forEach((result) => {
        const key = `${game.id}-${result.id}`;
        const edit = edits[key];
        
        if (edit && (edit.fh !== undefined || edit.sh !== undefined)) {
          // If one half is entered, both must be entered
          if ((edit.fh ?? result.fh) === null || (edit.sh ?? result.sh) === null) {
            newErrors.push(`Game ${game.id}: Enter both halves for ${result.team.name}`);
          }
        }
      });
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateScores()) return;

    setLoading(true);
    try {
      await onSave(edits);
      setEdits({});
    } catch (error) {
      setErrors([`Failed to save: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {errors.length > 0 && (
        <Alert variant="danger">
          {errors.map((error, idx) => (
            <div key={idx}>{error}</div>
          ))}
        </Alert>
      )}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Field</th>
            <th>Time</th>
            <th>Team</th>
            <th>1H</th>
            <th>2H</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <React.Fragment key={game.id}>
              {game.results.map((result) => {
                const key = `${game.id}-${result.id}`;
                const edit = edits[key] || {};
                const fh = edit.fh !== undefined ? edit.fh : result.fh;
                const sh = edit.sh !== undefined ? edit.sh : result.sh;
                const total = fh !== null && sh !== null ? fh + sh : null;

                return (
                  <tr key={key}>
                    <td>{game.field}</td>
                    <td>{game.scheduled}</td>
                    <td>{result.team.name}</td>
                    <td>
                      <Form.Control
                        type="number"
                        value={fh ?? ''}
                        onChange={(e) =>
                          handleScoreChange(game.id, result.id, 'fh', e.target.value)
                        }
                        disabled={loading}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        value={sh ?? ''}
                        onChange={(e) =>
                          handleScoreChange(game.id, result.id, 'sh', e.target.value)
                        }
                        disabled={loading}
                      />
                    </td>
                    <td>{total ?? '-'}</td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </Table>

      <Button
        variant="primary"
        onClick={handleSave}
        disabled={loading || Object.keys(edits).length === 0}
      >
        {loading ? 'Saving...' : 'Save Results'}
      </Button>
    </div>
  );
};
```

**Step 4: Run test to verify it passes**

```bash
npm --prefix gameday_designer run test:run -- src/components/__tests__/GameResultsTable.test.tsx
```

**Step 5: Commit**

```bash
git add gameday_designer/src/components/GameResultsTable.tsx gameday_designer/src/components/__tests__/GameResultsTable.test.tsx gameday_designer/src/types/designer.ts
git commit -m "feat: add game results table component with inline editing"
```

---

## Task 4: Integrate GameResultsTable into gameday_designer canvas

**Files:**
- Modify: `gameday_designer/src/components/DesignerCanvas.tsx`
- Modify: `gameday_designer/src/context/GamedayContext.tsx` (add results mode state)

**Step 1: Create test for results mode in context**

Add to `gameday_designer/src/context/__tests__/GamedayContext.test.tsx` (create if needed):

```typescript
import { renderHook, act } from '@testing-library/react';
import { GamedayProvider, useGamedayContext } from '../GamedayContext';

describe('GamedayContext Results Mode', () => {
  it('tracks results entry mode', () => {
    const { result } = renderHook(() => useGamedayContext(), {
      wrapper: GamedayProvider,
    });

    act(() => {
      result.current.setResultsMode(true);
    });

    expect(result.current.resultsMode).toBe(true);
  });
});
```

**Step 2: Update GamedayContext**

Modify `gameday_designer/src/context/GamedayContext.tsx`:

```typescript
interface GamedayContextType {
  // ... existing fields ...
  resultsMode: boolean;
  setResultsMode: (mode: boolean) => void;
  gameResults: GameResultsDisplay[];
  setGameResults: (results: GameResultsDisplay[]) => void;
}

export const GamedayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ... existing state ...
  const [resultsMode, setResultsMode] = useState(false);
  const [gameResults, setGameResultsInternal] = useState<GameResultsDisplay[]>([]);

  const setGameResults = useCallback(
    (results: GameResultsDisplay[]) => setGameResultsInternal(results),
    []
  );

  const value = useMemo(
    () => ({
      // ... existing values ...
      resultsMode,
      setResultsMode,
      gameResults,
      setGameResults,
    }),
    [/* ... deps ... */, resultsMode, gameResults, setGameResults]
  );

  return (
    <GamedayContext.Provider value={value}>
      {children}
    </GamedayContext.Provider>
  );
};
```

**Step 3: Update DesignerCanvas to show results mode**

Modify `gameday_designer/src/components/DesignerCanvas.tsx`:

```typescript
export const DesignerCanvas: React.FC = () => {
  const { resultsMode, setResultsMode, gameResults, setGameResults } = useGamedayContext();

  const handleToggleResultsMode = () => {
    if (resultsMode) {
      setResultsMode(false);
    } else {
      // Load game results before switching
      loadGameResults();
      setResultsMode(true);
    }
  };

  const loadGameResults = async () => {
    // Fetch games from API
    // const response = await fetch(`/api/gamedays/${gamedayId}/games/`);
    // setGameResults(await response.json());
  };

  return (
    <div>
      {resultsMode ? (
        <GameResultsTable games={gameResults} onSave={handleSaveResults} />
      ) : (
        <>
          {/* Existing designer canvas */}
          <Button onClick={handleToggleResultsMode} variant="success">
            Enter Results
          </Button>
        </>
      )}
    </div>
  );
};
```

**Step 4-5: Run tests and commit**

```bash
npm --prefix gameday_designer run test:run
git add gameday_designer/src/context/GamedayContext.tsx gameday_designer/src/components/DesignerCanvas.tsx
git commit -m "feat: add results entry mode to gameday designer"
```

---

## Task 5: End-to-end test with Chrome browser

**Files:**
- Create: `e2e/test_game_results_workflow.py` (or `.js` for Playwright)

**Purpose:** Complete workflow test using actual browser

**Step 1-5:** See detailed Chrome test scenario in `GAMERESULTS_TEST_SCENARIO.md`

---

## Execution Notes

- Each task should take 10-30 minutes
- All tests must pass before commit
- Run `npm run eslint` in gameday_designer before committing
- Run `pytest gamedays/` for backend tests
- Bracket resolution may need refinement based on tournament structure
- Consider storing bracket references as structured data (JSON) rather than team IDs
