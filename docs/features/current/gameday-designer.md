This feature is a designer frontend for existing gameday creation logic based in json

# Reference 
[schedule_manager.py](../gamedays/management/schedule_manager.py)
[schedule_update.py](../gamedays/management/schedule_update.py)
[schedule_4_final4_1.json](../gamedays/management/schedules/schedule_4_final4_1.json)
[update_4_final4_1.json](../gamedays/management/schedules/update_4_final4_1.json)

# Business Docs
https://docs.google.com/spreadsheets/d/1YRZk1Gt4OzBVzUamRIktJOFrMhmvGMk0ziGxmeih-ZY/edit?gid=0#gid=0 - [Leaguesphere - generische Spielpläne.ods](Leaguesphere%20-%20generische%20Spielpl%C3%A4ne.ods)
https://docs.google.com/spreadsheets/d/12IXSGWu4Di7y1uhwt4sBmTHyv0NTwCAEhqmk2fRX48o/edit?gid=624810271#gid=624810271 - [5er DFFL Generische Spielpläne.ods](5er%20DFFL%20Generische%20Spielpl%C3%A4ne.ods)

# description
design a modern react app to create gameday plans for flag football tournaments. as user, i want to enter a set of teams 5-8 and decide how they play against each other by dragging them into elements depicting decision point, like a flowchart. check the web for building of flag football gamerdays and their variants and come up with an mvp

# research
Flag Football Tournament Formats (for 5-8 teams):

Pool Play → Playoffs: Teams play round-robin in pools, top 50% advance to single elimination
Full Round Robin: Everyone plays everyone (5 teams = 10 games, 8 teams = 28 games)
Single Elimination: Direct knockout bracket
Double Elimination: Losers get second chance through consolation bracket
Modified Bracket: Hybrid formats with seeding from pools

🏈 Flag Football Gameday Planner — MVP Design
Based on my research of NFL FLAG tournament structures and common formats, here's what I've built:
Tournament Formats Supported
FormatDescriptionBest ForRound RobinEvery team plays every other teamFair ranking, 5-8 teamsSingle EliminationLose once, you're outQuick tournamentsDouble EliminationMust lose twice to exitSecond chancesPools → PlayoffsRound robin pools, then bracketNFL FLAG style, most popular
Key Features

Team Management — Add 5-8 teams with auto-assigned colors and drag-to-reorder
Drag & Drop Pool Assignment — Visually assign teams to Pool A/B for Pools→Playoffs format
Visual Tournament Flow — See the decision tree: Pools → Semifinals → Finals
Auto Schedule Generation — Generates proper round-robin pairings and bracket structures
Export to JSON — Download your schedule for external use

## History
- **2026-01-21**: Phase 1 Implementation - Gameday Management & Dashboard
  - Implemented centralized Gameday Dashboard with card-based listing.
  - Added Gameday lifecycle management (DRAFT, PUBLISHED, IN_PROGRESS, COMPLETED).
  - Implemented non-blocking deletion with a 10-second undo window.
  - Added real-time auto-save with visual status indicators.
  - Achieved >90% test coverage for all designer components.
  - Integrated with backend API for gameday publishing and result management.