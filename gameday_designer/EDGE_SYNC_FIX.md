# Edge Synchronization Fix

## Problem

When generating a tournament with playoff games (SF1, SF2, Final, 3rd Place), only the first 4 edges (connecting to SF1 and SF2) displayed correctly in the UI. The Final and 3rd Place games still showed "-- Select Team --" instead of showing the dynamic winner/loser connections from SF1/SF2.

Console logs confirmed that all 8 edges WERE being created, but they weren't synchronizing to the UI properly.

## Root Cause

The issue was a **React state batching problem**:

1. The `createPlacementEdges` function called `addGameToGameEdge` 8 times synchronously
2. Each call used `setEdges((eds) => [...eds, newEdge])` to add one edge
3. React batched these 8 state updates together for performance
4. The `useEffect(() => { ... }, [edges])` in `useFlowState.ts` (line 213) that syncs edges to game nodes depended on the `edges` array
5. Due to React's batching behavior, the effect might not have seen all 8 edges in the correct order, or the final state didn't include all edges before the sync ran

## Solution

**Added bulk edge addition to ensure atomic state updates:**

### 1. Created `addBulkGameToGameEdges` function in `useFlowState.ts`

```typescript
const addBulkGameToGameEdges = useCallback(
  (edgesToAdd: Array<{
    sourceGameId: string;
    outputType: 'winner' | 'loser';
    targetGameId: string;
    targetSlot: 'home' | 'away';
  }>): string[] => {
    if (edgesToAdd.length === 0) return [];

    const newEdges = edgesToAdd.map(({ sourceGameId, outputType, targetGameId, targetSlot }) => {
      const edgeId = `edge-${uuidv4()}`;
      return createGameToGameEdge(edgeId, sourceGameId, outputType, targetGameId, targetSlot);
    });

    // Add all edges in a single state update
    setEdges((eds) => [...eds, ...newEdges]);

    // Clear static team assignments for all affected slots
    const teamClearUpdates = new Map<string, Partial<GameNodeData>>();
    edgesToAdd.forEach(({ targetGameId, targetSlot }) => {
      const existing = teamClearUpdates.get(targetGameId) || {};
      teamClearUpdates.set(targetGameId, {
        ...existing,
        [targetSlot === 'home' ? 'homeTeamId' : 'awayTeamId']: null,
      });
    });

    teamClearUpdates.forEach((updates, gameId) => {
      updateNode(gameId, updates);
    });

    return newEdges.map(e => e.id);
  },
  [setEdges, updateNode]
);
```

**Key benefits:**
- All edges are added in **one atomic `setEdges` call**
- React doesn't batch multiple updates; there's only one update
- The `useEffect` that depends on `edges` sees all edges at once
- Guarantees proper synchronization

### 2. Refactored `createPlacementEdges` to collect edges instead of adding them immediately

Changed from:
```typescript
const createPlacementEdges = (targetGames, sourceGames, config, onAddEdge) => {
  // ...
  onAddEdge(sf1.id, 'winner', final.id, 'home');
  onAddEdge(sf2.id, 'winner', final.id, 'away');
  // ...
}
```

To:
```typescript
const createPlacementEdges = (targetGames, sourceGames, config): EdgeSpec[] => {
  const edgesToAdd: EdgeSpec[] = [];
  // ...
  edgesToAdd.push({ sourceGameId: sf1.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'home' });
  edgesToAdd.push({ sourceGameId: sf2.id, outputType: 'winner', targetGameId: final.id, targetSlot: 'away' });
  // ...
  return edgesToAdd;
}
```

### 3. Updated `assignTeamsToTournament` to use bulk addition

```typescript
else if (stageData.progressionMode === 'placement') {
  const edgesToAdd = createPlacementEdges(stageGames, previousOrderGames, stageData.progressionConfig);

  if (edgesToAdd.length > 0) {
    addBulkGameToGameEdges(edgesToAdd);  // Single atomic state update
  }
}
```

## Files Modified

1. **`/home/cda/dev/leaguesphere/gameday_designer/src/hooks/useFlowState.ts`**
   - Added `addBulkGameToGameEdges` function (lines 1022-1065)
   - Exported in `UseFlowStateReturn` interface (lines 111-116)
   - Exported in hook return (line 1571)

2. **`/home/cda/dev/leaguesphere/gameday_designer/src/components/ListDesignerApp.tsx`**
   - Destructured `addBulkGameToGameEdges` from `useFlowState()` (line 65)
   - Refactored `createPlacementEdges` to return edge specs instead of calling `onAddEdge` (lines 286-486)
   - Updated `assignTeamsToTournament` to use `addBulkGameToGameEdges` (lines 573-586)
   - Updated dependency array (line 597)

## Expected Outcome

After this fix:
- All 8 playoff game edges are created in a single atomic state update
- The `useEffect` in `useFlowState.ts` that syncs edges to game nodes sees all 8 edges at once
- **SF1** shows: ⚡ Winner of Game 1 vs ⚡ Winner of Game 2 ✅
- **SF2** shows: ⚡ Winner of Game 3 vs 💔 Loser of Game 1 ✅
- **Final** shows: ⚡ Winner of SF1 vs ⚡ Winner of SF2 ✅
- **3rd Place** shows: 💔 Loser of SF1 vs 💔 Loser of SF2 ✅

## Testing

1. Open the Gameday Designer
2. Click "Generate Tournament"
3. Select "4-team Single Elimination"
4. Enable "Auto-assign teams"
5. Verify that all 4 playoff games show dynamic team references correctly
6. Check browser console logs to confirm all 8 edges are created and synced

## Technical Notes

**Why this works:**
- React's state batching is designed to improve performance by coalescing multiple `setState` calls into one re-render
- When multiple `setEdges` calls happen synchronously, React batches them
- However, functional updates `setEdges(eds => [...eds, newEdge])` rely on previous state, which can lead to race conditions in batched updates
- By creating all edges in an array first, then doing a single `setEdges(eds => [...eds, ...allNewEdges])`, we ensure:
  - Only one state update happens
  - All edges are present before the `useEffect` dependency check runs
  - Proper synchronization between edge state and game node dynamic references

**Alternative approaches considered:**
1. Using `flushSync` from React DOM - rejected because it forces synchronous rendering and can hurt performance
2. Adding a separate effect to re-sync after edge count changes - rejected because it's a band-aid solution
3. Removing React.StrictMode double-rendering - rejected because it wouldn't fix the underlying race condition

**This solution is the cleanest** because it addresses the root cause: ensuring all edges are present in state before the sync effect runs.
