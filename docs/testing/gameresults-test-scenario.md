# Game Results Feature - First Run Test Scenario

## Objective
Create a gameday, generate a tournament, publish it, and enter game results while resolving bracket references.

## Setup Phase
1. Create a new gameday with the following details:
   - Name: "Test Tournament - Feb 2026"
   - Season: "2026"
   - League: "DFFL"
   - Date: "2026-02-03"
   - Start Time: "10:00"
   - Format: "6_2" (6 teams, 2 fields)

2. Add teams to the gameday:
   - Team A
   - Team B
   - Team C
   - Team D
   - Team E
   - Team F

## Tournament Generation Phase
3. Generate tournament bracket automatically
   - System should create games with bracket references
   - Example references: "Winner of Game 1 vs Winner of Game 2"

## Publication Phase
4. Publish the gameday
   - Status changes to PUBLISHED
   - All games are now ready for results entry

## Results Entry Phase
5. Enter results for all games in order (resolving bracket references as we go):
   
   **Group Stage (Games 1-3):**
   - Game 1: Team A (3) vs Team B (1) → Team A wins
   - Game 2: Team C (2) vs Team D (2) → Draw
   - Game 3: Team E (4) vs Team F (1) → Team E wins
   
   **Bracket Resolution:**
   - After Game 1 result: Winner slot in Game 4 resolves to Team A
   - After Game 2 result: Loser slot in Game 4 resolves to Team D
   - After Game 3 result: Winner slot in Game 5 resolves to Team E

   **Finals (Games 4-5):**
   - Game 4: Team A (winner of 1) vs Team D (loser of 2) → Team A wins
   - Game 5: Team E (winner of 3) vs [depends on Game 4]
   
## Validation Points
- ✓ Gameday created with correct metadata
- ✓ Tournament structure generated with bracket references
- ✓ Gameday published successfully
- ✓ Games displayed in results entry UI
- ✓ Scores entered for each game
- ✓ Bracket references resolved when upstream games are completed
- ✓ Final scores saved correctly
- ✓ All data persisted to database

## Technical Requirements
- Backend API endpoints functional
- React component renders correctly
- Indirect references properly calculated
- Transaction atomicity maintained
- Validation prevents incomplete data persistence
