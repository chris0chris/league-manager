# Track 004: Manual Team Color Generation (#672)

## Goals
Ensure that teams added manually to the team pool automatically receive distinct colors from the predefined palette, similar to auto-generated teams.

## Tasks
- [ ] **Task 1: Implement color rotation for manual team addition**
  - Update `addGlobalTeam` to determine the next color based on existing team count or rotation.
- [ ] **Task 2: Verify color assignment UI**
  - Confirm that newly added team rows immediately show the assigned color.
- [ ] **Task 3: Unit Tests for Color Assignment**
  - Ensure that adding multiple teams manually results in different colors.
