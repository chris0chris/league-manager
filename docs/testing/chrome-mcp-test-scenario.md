# Chrome MCP Test Scenario - Game Results Feature

## Objective
Test the complete game results entry workflow on the staging environment, including:

1. **Gameday Creation** → **Tournament Generation** → **Publication** → **Results Entry**
2. **Bracket Reference Resolution** (e.g., "Winner of Game 1")
3. **Score Entry** with inline editing
4. **Data Persistence** verification
5. **UI/UX** validation

## Test Environment
- **URL:** https://stage.leaguesphere.com
- **Feature:** Game Results Entry
- **Version:** 2.17.3-rc.75 (deployed)
- **Browser:** Chrome

## Test Steps

### 1. **Access Staging Environment**
- Open Chrome and navigate to https://stage.leaguesphere.com
- Verify the application loads correctly
- Check for any console errors

### 2. **Create New Gameday**
- Click "Create Gameday" or similar button
- Enter details:
  - Name: "Test Tournament - Stage"
  - Season: "2026"
  - League: "DFFL"
  - Date: "2026-02-03"
  - Start Time: "10:00"
  - Format: "6_2" (6 teams, 2 fields)
- Save the gameday

### 3. **Add Teams to Gameday**
- Add 6 teams:
  - Team A, Team B, Team C, Team D, Team E, Team F
- Verify teams are listed

### 4. **Generate Tournament**
- Click "Generate Tournament" or similar
- Verify tournament structure is created
- Check for bracket references (e.g., "Winner of Game 1")

### 5. **Publish Gameday**
- Click "Publish" or similar
- Verify status changes to "Published"
- Confirm all games are now available for results entry

### 6. **Enter Game Results**
- Navigate to "Enter Results" or similar
- For each game, enter scores:
  - Game 1: Team A (3) vs Team B (1) → Team A wins
  - Game 2: Team C (2) vs Team D (2) → Team C wins
  - Game 3: Team E (4) vs Team F (1) → Team E wins
  - Game 4: Winner(Game1) vs Winner(Game2) → Team A wins
  - Game 5: Winner(Game3) vs Winner(Game4) → Team E wins

### 7. **Verify Bracket Resolution**
- Check that bracket references resolve correctly:
  - Game 4 home: "Winner of Game 1" → Team A
  - Game 4 away: "Winner of Game 2" → Team C
  - Game 5 home: "Winner of Game 3" → Team E
  - Game 5 away: "Winner of Game 4" → Team A

### 8. **Validate Data Persistence**
- Verify scores are saved correctly
- Check that bracket references are resolved in database
- Confirm game locking prevents duplicate entries

### 9. **UI/UX Validation**
- Check inline editing works smoothly
- Verify validation messages appear for incomplete entries
- Test responsive design on different screen sizes
- Check for any console errors or warnings

## **Expected Results**

### **Functional Requirements**
- ✅ Gameday created successfully
- ✅ Tournament generated with correct bracket structure
- ✅ Gameday published and ready for results
- ✅ Game results entered and saved correctly
- ✅ Bracket references resolved automatically
- ✅ Data persisted to database
- ✅ Validation prevents incomplete entries

### **UI/UX Requirements**
- ✅ Inline editing works smoothly
- ✅ Real-time validation feedback
- ✅ Responsive design
- ✅ No console errors
- ✅ Professional appearance

### **Performance Requirements**
- ✅ Fast loading times
- ✅ Smooth transitions
- ✅ No lag during editing
- ✅ Efficient bracket resolution

## **Success Criteria**

### **Functional Success**
- All games display with correct teams
- Scores can be entered and saved
- Bracket references resolve correctly
- Data persists across page refreshes

### **UI/UX Success**
- Interface is intuitive and professional
- No visual glitches or layout issues
- Responsive on different screen sizes
- Clear error messages and validation

### **Technical Success**
- No JavaScript errors in console
- Efficient database queries
- Proper error handling
- Secure data handling

## **Test Data**

### **Test Teams**
- Team A, Team B, Team C, Team D, Team E, Team F

### **Test Scores**
- Game 1: Team A 3 - 1 Team B
- Game 2: Team C 2 - 0 Team D
- Game 3: Team E 4 - 1 Team F
- Game 4: Team A 2 - 1 Team C
- Game 5: Team E 3 - 2 Team A

### **Expected Winners**
- Game 1 Winner: Team A
- Game 2 Winner: Team C
- Game 3 Winner: Team E
- Game 4 Winner: Team A
- Game 5 Winner: Team E

## **Troubleshooting**

### **Common Issues**
1. **SSL Errors:** Check certificate and try different browser
2. **Loading Issues:** Clear cache and reload
3. **API Errors:** Check network tab for failed requests
4. **UI Issues:** Check for JavaScript errors in console

### **Debugging Steps**
1. **Check Console:** Look for JavaScript errors
2. **Network Tab:** Verify API calls are successful
3. **Database:** Check if data is persisting correctly
4. **Browser DevTools:** Use to inspect elements and debug

## **Reporting**

### **Success Report**
- Document all steps completed successfully
- Include screenshots of key screens
- Note any performance observations
- Verify all success criteria met

### **Issue Report**
- Document any errors or issues encountered
- Include error messages and screenshots
- Note steps to reproduce issues
- Suggest potential fixes

---

**Test Environment:** Stage (https://stage.leaguesphere.com)  
**Feature:** Game Results Entry  
**Version:** 2.17.3-rc.75  
**Status:** Ready for testing  
**Expected Outcome:** All functional and UI requirements met