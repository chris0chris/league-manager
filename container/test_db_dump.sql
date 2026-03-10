/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.5-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: test_db
-- ------------------------------------------------------
-- Server version	11.8.5-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Dumping data for table `gamedays_league`
--

LOCK TABLES `gamedays_league` WRITE;
/*!40000 ALTER TABLE `gamedays_league` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_league` (`id`, `name`) VALUES (1,'Test League');
/*!40000 ALTER TABLE `gamedays_league` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_season`
--

LOCK TABLES `gamedays_season` WRITE;
/*!40000 ALTER TABLE `gamedays_season` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_season` (`id`, `name`) VALUES (1,'2025');
/*!40000 ALTER TABLE `gamedays_season` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_team`
--

LOCK TABLES `gamedays_team` WRITE;
/*!40000 ALTER TABLE `gamedays_team` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_team` (`id`, `name`, `description`, `location`, `logo`, `association_id`) VALUES (1,'Team 1','Team 1','','',NULL),
(2,'Team 2','Team 2','','',NULL),
(3,'Team 3','Team 3','','',NULL),
(4,'Team 4','Team 4','','',NULL),
(5,'Team 5','Team 5','','',NULL),
(6,'Team 6','Team 6','','',NULL),
(7,'Test Placeholder','Test Placeholder','','',NULL),
(8,'A1','A1','dummy','',NULL),
(9,'A2','A2','dummy','',NULL),
(10,'A3','F','dummy','',NULL),
(11,'B1','B1','dummy','',NULL),
(12,'B2','B2','dummy','',NULL),
(13,'B3','B3','dummy','',NULL),
(14,'P3 Gruppe 2','P3 Gruppe 2','dummy','',NULL),
(15,'P3 Gruppe 1','P3 Gruppe 1','dummy','',NULL),
(16,'P2 Gruppe 2','P2 Gruppe 2','dummy','',NULL),
(17,'P2 Gruppe 1','P2 Gruppe 1','dummy','',NULL),
(18,'P1 Gruppe 2','P1 Gruppe 2','dummy','',NULL),
(19,'P1 Gruppe 1','P1 Gruppe 1','dummy','',NULL),
(20,'Gewinner HF1','Gewinner HF1','dummy','',NULL),
(31,'Gewinner HF2','Gewinner HF2','dummy','',NULL),
(32,'Gewinner P3','Gewinner P3','dummy','',NULL),
(33,'Verlierer HF1','Verlierer HF1','dummy','',NULL),
(34,'Verlierer HF2','Verlierer HF2','dummy','',NULL),
(35,'Verlierer P3','Verlierer P3','dummy','',NULL),
(36,'P4 Gruppe 1','P4 Gruppe 1','dummy','',NULL);
/*!40000 ALTER TABLE `gamedays_team` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_gameday`
--

LOCK TABLES `gamedays_gameday` WRITE;
/*!40000 ALTER TABLE `gamedays_gameday` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_gameday` (`id`, `name`, `date`, `start`, `format`, `author_id`, `league_id`, `season_id`, `address`, `published_at`, `status`, `designer_data`) VALUES (1,'Test-Gameday-Designer','2026-02-08','10:00:00.000000','6_2',1,1,1,'Munich','2026-02-08 23:18:05.885132','PUBLISHED','{\"nodes\": [{\"id\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"type\": \"field\", \"position\": {\"x\": 50, \"y\": 50}, \"data\": {\"type\": \"field\", \"name\": \"Feld 1\", \"order\": 0, \"color\": \"#d1ecf1\"}, \"style\": {\"width\": 350, \"height\": 300}, \"draggable\": false, \"selectable\": true}, {\"id\": \"stage-d6089225-624b-4292-8e48-0081597345b6\", \"type\": \"stage\", \"parentId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"position\": {\"x\": 20, \"y\": 60}, \"data\": {\"type\": \"stage\", \"name\": \"Group Stage A\", \"category\": \"preliminary\", \"stageType\": \"STANDARD\", \"order\": 0, \"startTime\": \"10:00\", \"defaultGameDuration\": 70, \"defaultBreakBetweenGames\": 10, \"progressionMode\": \"round_robin\", \"progressionConfig\": {\"mode\": \"round_robin\", \"teamCount\": 3, \"doubleRound\": false}}, \"style\": {\"width\": 300, \"height\": 150}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"stage-f0e4b1ee-b9ae-46eb-bce6-28125e82e6e8\", \"type\": \"stage\", \"parentId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"position\": {\"x\": 20, \"y\": 60}, \"data\": {\"type\": \"stage\", \"name\": \"Group Stage B\", \"category\": \"preliminary\", \"stageType\": \"STANDARD\", \"order\": 0, \"startTime\": \"14:00\", \"defaultGameDuration\": 70, \"defaultBreakBetweenGames\": 10, \"progressionMode\": \"round_robin\", \"progressionConfig\": {\"mode\": \"round_robin\", \"teamCount\": 3, \"doubleRound\": false}}, \"style\": {\"width\": 300, \"height\": 150}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"stage-ceb899fb-7a9c-44d3-8754-a550eb345c23\", \"type\": \"stage\", \"parentId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"position\": {\"x\": 20, \"y\": 60}, \"data\": {\"type\": \"stage\", \"name\": \"Playoffs\", \"category\": \"preliminary\", \"stageType\": \"STANDARD\", \"order\": 1, \"startTime\": \"18:00\", \"defaultGameDuration\": 70, \"defaultBreakBetweenGames\": 10, \"progressionMode\": \"placement\", \"progressionConfig\": {\"mode\": \"placement\", \"positions\": 4, \"format\": \"single_elimination\"}, \"progressionMapping\": {\"SF1\": {\"home\": {\"sourceIndex\": 0, \"type\": \"winner\"}, \"away\": {\"sourceIndex\": 3, \"type\": \"winner\"}}, \"SF2\": {\"home\": {\"sourceIndex\": 2, \"type\": \"winner\"}, \"away\": {\"sourceIndex\": 5, \"type\": \"winner\"}}, \"3rd Place\": {\"home\": {\"sourceIndex\": 0, \"type\": \"loser\"}, \"away\": {\"sourceIndex\": 1, \"type\": \"loser\"}}}}, \"style\": {\"width\": 300, \"height\": 150}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-1\", \"type\": \"game\", \"parentId\": \"stage-d6089225-624b-4292-8e48-0081597345b6\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"A Game 1\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-97b84e5b-c2a6-41b0-ac74-d9ed7cbaffa4\"}, \"breakAfter\": 10, \"homeTeamId\": \"team-8c76143a-ddce-4779-be50-4f4d01550842\", \"awayTeamId\": \"team-6cd106c7-9aae-41c2-9e26-25ff9116a56e\", \"homeTeamDynamic\": null, \"awayTeamDynamic\": null, \"duration\": 70, \"startTime\": \"10:00\", \"manualTime\": false}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-2\", \"type\": \"game\", \"parentId\": \"stage-d6089225-624b-4292-8e48-0081597345b6\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"A Game 2\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-6cd106c7-9aae-41c2-9e26-25ff9116a56e\"}, \"breakAfter\": 10, \"homeTeamId\": \"team-97b84e5b-c2a6-41b0-ac74-d9ed7cbaffa4\", \"awayTeamId\": \"team-8c76143a-ddce-4779-be50-4f4d01550842\", \"homeTeamDynamic\": null, \"awayTeamDynamic\": null, \"duration\": 70, \"startTime\": \"11:20\", \"manualTime\": false}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-3\", \"type\": \"game\", \"parentId\": \"stage-d6089225-624b-4292-8e48-0081597345b6\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"A Game 3\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-8c76143a-ddce-4779-be50-4f4d01550842\"}, \"breakAfter\": 10, \"homeTeamId\": \"team-6cd106c7-9aae-41c2-9e26-25ff9116a56e\", \"awayTeamId\": \"team-97b84e5b-c2a6-41b0-ac74-d9ed7cbaffa4\", \"homeTeamDynamic\": null, \"awayTeamDynamic\": null, \"duration\": 70, \"startTime\": \"12:40\", \"manualTime\": false}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-4\", \"type\": \"game\", \"parentId\": \"stage-f0e4b1ee-b9ae-46eb-bce6-28125e82e6e8\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"B Game 1\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-cac2bd9a-4059-4094-a734-b4cf4f6547e0\"}, \"breakAfter\": 10, \"homeTeamId\": \"team-35ffa3c8-a241-4f53-a53e-e20a2c3e92ca\", \"awayTeamId\": \"team-72b72535-849e-4c3e-9a49-f9e66d2327bc\", \"homeTeamDynamic\": null, \"awayTeamDynamic\": null, \"duration\": 70, \"startTime\": \"14:00\", \"manualTime\": false}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-5\", \"type\": \"game\", \"parentId\": \"stage-f0e4b1ee-b9ae-46eb-bce6-28125e82e6e8\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"B Game 2\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-72b72535-849e-4c3e-9a49-f9e66d2327bc\"}, \"breakAfter\": 10, \"homeTeamId\": \"team-cac2bd9a-4059-4094-a734-b4cf4f6547e0\", \"awayTeamId\": \"team-35ffa3c8-a241-4f53-a53e-e20a2c3e92ca\", \"homeTeamDynamic\": null, \"awayTeamDynamic\": null, \"duration\": 70, \"startTime\": \"15:20\", \"manualTime\": false}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-6\", \"type\": \"game\", \"parentId\": \"stage-f0e4b1ee-b9ae-46eb-bce6-28125e82e6e8\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"B Game 3\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-35ffa3c8-a241-4f53-a53e-e20a2c3e92ca\"}, \"breakAfter\": 10, \"homeTeamId\": \"team-72b72535-849e-4c3e-9a49-f9e66d2327bc\", \"awayTeamId\": \"team-cac2bd9a-4059-4094-a734-b4cf4f6547e0\", \"homeTeamDynamic\": null, \"awayTeamDynamic\": null, \"duration\": 70, \"startTime\": \"16:40\", \"manualTime\": false}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-7\", \"type\": \"game\", \"parentId\": \"stage-ceb899fb-7a9c-44d3-8754-a550eb345c23\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"SF1\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-8c76143a-ddce-4779-be50-4f4d01550842\"}, \"breakAfter\": 10, \"homeTeamId\": null, \"awayTeamId\": null, \"homeTeamDynamic\": {\"type\": \"winner\", \"matchName\": \"A Game 1\"}, \"awayTeamDynamic\": {\"type\": \"winner\", \"matchName\": \"B Game 1\"}, \"duration\": 70, \"startTime\": \"18:00\", \"manualTime\": false, \"resolvedHomeTeam\": null, \"resolvedAwayTeam\": null}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-8\", \"type\": \"game\", \"parentId\": \"stage-ceb899fb-7a9c-44d3-8754-a550eb345c23\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"SF2\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-6cd106c7-9aae-41c2-9e26-25ff9116a56e\"}, \"breakAfter\": 10, \"homeTeamId\": null, \"awayTeamId\": null, \"homeTeamDynamic\": {\"type\": \"winner\", \"matchName\": \"A Game 3\"}, \"awayTeamDynamic\": {\"type\": \"winner\", \"matchName\": \"B Game 3\"}, \"duration\": 70, \"startTime\": \"19:20\", \"manualTime\": false, \"resolvedHomeTeam\": null, \"resolvedAwayTeam\": null}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-9\", \"type\": \"game\", \"parentId\": \"stage-ceb899fb-7a9c-44d3-8754-a550eb345c23\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"Final\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-97b84e5b-c2a6-41b0-ac74-d9ed7cbaffa4\"}, \"breakAfter\": 10, \"homeTeamId\": null, \"awayTeamId\": null, \"homeTeamDynamic\": {\"type\": \"winner\", \"matchName\": \"SF1\"}, \"awayTeamDynamic\": {\"type\": \"winner\", \"matchName\": \"SF2\"}, \"duration\": 70, \"startTime\": \"22:00\", \"manualTime\": false, \"resolvedHomeTeam\": null, \"resolvedAwayTeam\": null}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}, {\"id\": \"game-10\", \"type\": \"game\", \"parentId\": \"stage-ceb899fb-7a9c-44d3-8754-a550eb345c23\", \"position\": {\"x\": 30, \"y\": 50}, \"data\": {\"type\": \"game\", \"stage\": \"Preliminary\", \"stageType\": \"STANDARD\", \"standing\": \"3rd Place\", \"fieldId\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"official\": {\"type\": \"static\", \"name\": \"team-35ffa3c8-a241-4f53-a53e-e20a2c3e92ca\"}, \"breakAfter\": 10, \"homeTeamId\": null, \"awayTeamId\": null, \"homeTeamDynamic\": {\"type\": \"loser\", \"matchName\": \"SF1\"}, \"awayTeamDynamic\": {\"type\": \"loser\", \"matchName\": \"SF2\"}, \"duration\": 70, \"startTime\": \"20:40\", \"manualTime\": false, \"resolvedHomeTeam\": null, \"resolvedAwayTeam\": null}, \"extent\": \"parent\", \"expandParent\": true, \"draggable\": false, \"selectable\": true}], \"edges\": [{\"id\": \"edge-a2c43f77-81df-473c-a65b-d63bc641eb27\", \"type\": \"gameToGame\", \"source\": \"game-1\", \"target\": \"game-7\", \"sourceHandle\": \"winner\", \"targetHandle\": \"home\", \"data\": {\"sourcePort\": \"winner\", \"targetPort\": \"home\"}}, {\"id\": \"edge-3070e958-ba81-4839-9465-ac582020a842\", \"type\": \"gameToGame\", \"source\": \"game-4\", \"target\": \"game-7\", \"sourceHandle\": \"winner\", \"targetHandle\": \"away\", \"data\": {\"sourcePort\": \"winner\", \"targetPort\": \"away\"}}, {\"id\": \"edge-7a0d6a90-bb9c-4b5a-81f7-9e98ffd791ef\", \"type\": \"gameToGame\", \"source\": \"game-3\", \"target\": \"game-8\", \"sourceHandle\": \"winner\", \"targetHandle\": \"home\", \"data\": {\"sourcePort\": \"winner\", \"targetPort\": \"home\"}}, {\"id\": \"edge-ca511b89-d103-495b-bb99-1d6dfc28346d\", \"type\": \"gameToGame\", \"source\": \"game-6\", \"target\": \"game-8\", \"sourceHandle\": \"winner\", \"targetHandle\": \"away\", \"data\": {\"sourcePort\": \"winner\", \"targetPort\": \"away\"}}, {\"id\": \"edge-ed555495-97bb-4a5c-8f85-965096a51569\", \"type\": \"gameToGame\", \"source\": \"game-1\", \"target\": \"game-10\", \"sourceHandle\": \"loser\", \"targetHandle\": \"home\", \"data\": {\"sourcePort\": \"loser\", \"targetPort\": \"home\"}}, {\"id\": \"edge-45bc2a34-38ea-4362-85ab-bcf7f02ce10e\", \"type\": \"gameToGame\", \"source\": \"game-2\", \"target\": \"game-10\", \"sourceHandle\": \"loser\", \"targetHandle\": \"away\", \"data\": {\"sourcePort\": \"loser\", \"targetPort\": \"away\"}}, {\"id\": \"edge-27bffca4-d4a8-40e4-b09e-cc9faa2456ff\", \"type\": \"gameToGame\", \"source\": \"game-7\", \"target\": \"game-9\", \"sourceHandle\": \"winner\", \"targetHandle\": \"home\", \"data\": {\"sourcePort\": \"winner\", \"targetPort\": \"home\"}}, {\"id\": \"edge-e8666057-c833-4c5c-a498-1399b208142b\", \"type\": \"gameToGame\", \"source\": \"game-8\", \"target\": \"game-9\", \"sourceHandle\": \"winner\", \"targetHandle\": \"away\", \"data\": {\"sourcePort\": \"winner\", \"targetPort\": \"away\"}}, {\"id\": \"edge-54e2c528-1e49-45e1-a741-9844e9ac6967\", \"type\": \"gameToGame\", \"source\": \"game-7\", \"target\": \"game-10\", \"sourceHandle\": \"loser\", \"targetHandle\": \"home\", \"data\": {\"sourcePort\": \"loser\", \"targetPort\": \"home\"}}, {\"id\": \"edge-bad8b138-a24a-4a79-b181-87daa34f46e3\", \"type\": \"gameToGame\", \"source\": \"game-8\", \"target\": \"game-10\", \"sourceHandle\": \"loser\", \"targetHandle\": \"away\", \"data\": {\"sourcePort\": \"loser\", \"targetPort\": \"away\"}}], \"fields\": [{\"id\": \"field-d4073eb5-ee6b-4cb8-a2dc-bf8f527d207d\", \"name\": \"Feld 1\", \"order\": 0, \"color\": \"#d1ecf1\"}], \"globalTeams\": [{\"id\": \"team-8c76143a-ddce-4779-be50-4f4d01550842\", \"label\": \"Team 1\", \"groupId\": \"group-43cd8ed7-cfd2-4c0f-a176-464aeb9b573d\", \"order\": 0, \"color\": \"#3498db\"}, {\"id\": \"team-6cd106c7-9aae-41c2-9e26-25ff9116a56e\", \"label\": \"Team 2\", \"groupId\": \"group-43cd8ed7-cfd2-4c0f-a176-464aeb9b573d\", \"order\": 0, \"color\": \"#e74c3c\"}, {\"id\": \"team-97b84e5b-c2a6-41b0-ac74-d9ed7cbaffa4\", \"label\": \"Team 3\", \"groupId\": \"group-43cd8ed7-cfd2-4c0f-a176-464aeb9b573d\", \"order\": 0, \"color\": \"#2ecc71\"}, {\"id\": \"team-35ffa3c8-a241-4f53-a53e-e20a2c3e92ca\", \"label\": \"Team 4\", \"groupId\": \"group-8d97b0a6-bfb2-4973-b090-baea200202e0\", \"order\": 0, \"color\": \"#f39c12\"}, {\"id\": \"team-72b72535-849e-4c3e-9a49-f9e66d2327bc\", \"label\": \"Team 5\", \"groupId\": \"group-8d97b0a6-bfb2-4973-b090-baea200202e0\", \"order\": 0, \"color\": \"#9b59b6\"}, {\"id\": \"team-cac2bd9a-4059-4094-a734-b4cf4f6547e0\", \"label\": \"Team 6\", \"groupId\": \"group-8d97b0a6-bfb2-4973-b090-baea200202e0\", \"order\": 0, \"color\": \"#1abc9c\"}], \"globalTeamGroups\": [{\"id\": \"group-43cd8ed7-cfd2-4c0f-a176-464aeb9b573d\", \"name\": \"Gruppe A\", \"order\": 0}, {\"id\": \"group-8d97b0a6-bfb2-4973-b090-baea200202e0\", \"name\": \"Gruppe B\", \"order\": 0}]}'),
(2,'Test-Original','2026-02-09','10:00:00.000000','6_2',1,1,1,'munich',NULL,'DRAFT',NULL);
/*!40000 ALTER TABLE `gamedays_gameday` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_gameinfo`
--

LOCK TABLES `gamedays_gameinfo` WRITE;
/*!40000 ALTER TABLE `gamedays_gameinfo` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_gameinfo` (`id`, `scheduled`, `field`, `status`, `gameStarted`, `gameHalftime`, `gameFinished`, `stage`, `standing`, `gameday_id`, `officials_id`, `in_possession`, `league_group_id`, `final_score`, `halftime_score`, `is_locked`) VALUES (1,'10:00:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','A Game 1',1,3,NULL,NULL,NULL,NULL,0),
(2,'11:20:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','A Game 2',1,2,NULL,NULL,NULL,NULL,0),
(3,'12:40:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','A Game 3',1,1,NULL,NULL,NULL,NULL,0),
(4,'14:00:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','B Game 1',1,6,NULL,NULL,NULL,NULL,0),
(5,'15:20:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','B Game 2',1,5,NULL,NULL,NULL,NULL,0),
(6,'16:40:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','B Game 3',1,4,NULL,NULL,NULL,NULL,0),
(7,'18:00:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','SF1',1,1,NULL,NULL,NULL,NULL,0),
(8,'19:20:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','SF2',1,2,NULL,NULL,NULL,NULL,0),
(9,'22:00:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','Final',1,3,NULL,NULL,NULL,NULL,0),
(10,'20:40:00.000000',1,'Geplant',NULL,NULL,NULL,'Preliminary','3rd Place',1,4,NULL,NULL,NULL,NULL,0),
(14,'10:00:00.000000',1,'Geplant',NULL,NULL,NULL,'Vorrunde','Gruppe 1',2,6,NULL,NULL,NULL,NULL,0),
(15,'11:10:00.000000',1,'Geplant',NULL,NULL,NULL,'Vorrunde','Gruppe 1',2,5,NULL,NULL,NULL,NULL,0),
(16,'12:20:00.000000',1,'Geplant',NULL,NULL,NULL,'Vorrunde','Gruppe 1',2,4,NULL,NULL,NULL,NULL,0),
(17,'13:30:00.000000',1,'Geplant',NULL,NULL,NULL,'Finalrunde','HF',2,14,NULL,NULL,NULL,NULL,0),
(18,'14:40:00.000000',1,'Geplant',NULL,NULL,NULL,'Finalrunde','P3',2,31,NULL,NULL,NULL,NULL,0),
(19,'15:50:00.000000',1,'Geplant',NULL,NULL,NULL,'Finalrunde','P1',2,32,NULL,NULL,NULL,NULL,0),
(20,'10:00:00.000000',2,'Geplant',NULL,NULL,NULL,'Vorrunde','Gruppe 2',2,3,NULL,NULL,NULL,NULL,0),
(21,'11:10:00.000000',2,'Geplant',NULL,NULL,NULL,'Vorrunde','Gruppe 2',2,2,NULL,NULL,NULL,NULL,0),
(22,'12:20:00.000000',2,'Geplant',NULL,NULL,NULL,'Vorrunde','Gruppe 2',2,1,NULL,NULL,NULL,NULL,0),
(23,'13:30:00.000000',2,'Geplant',NULL,NULL,NULL,'Finalrunde','HF',2,15,NULL,NULL,NULL,NULL,0),
(24,'14:40:00.000000',2,'Geplant',NULL,NULL,NULL,'Finalrunde','P5',2,20,NULL,NULL,NULL,NULL,0);
/*!40000 ALTER TABLE `gamedays_gameinfo` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_gameresult`
--

LOCK TABLES `gamedays_gameresult` WRITE;
/*!40000 ALTER TABLE `gamedays_gameresult` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_gameresult` (`id`, `fh`, `sh`, `pa`, `isHome`, `gameinfo_id`, `team_id`) VALUES (1,NULL,NULL,NULL,1,1,1),
(2,NULL,NULL,NULL,0,1,2),
(3,NULL,NULL,NULL,1,2,3),
(4,NULL,NULL,NULL,0,2,1),
(5,NULL,NULL,NULL,1,3,2),
(6,NULL,NULL,NULL,0,3,3),
(7,NULL,NULL,NULL,1,4,4),
(8,NULL,NULL,NULL,0,4,5),
(9,NULL,NULL,NULL,1,5,6),
(10,NULL,NULL,NULL,0,5,4),
(11,NULL,NULL,NULL,1,6,5),
(12,NULL,NULL,NULL,0,6,6),
(13,NULL,NULL,NULL,1,7,NULL),
(14,NULL,NULL,NULL,0,7,NULL),
(15,NULL,NULL,NULL,1,8,NULL),
(16,NULL,NULL,NULL,0,8,NULL),
(17,NULL,NULL,NULL,1,9,NULL),
(18,NULL,NULL,NULL,0,9,NULL),
(19,NULL,NULL,NULL,1,10,NULL),
(20,NULL,NULL,NULL,0,10,NULL),
(27,NULL,NULL,NULL,1,14,1),
(28,NULL,NULL,NULL,0,14,2),
(29,NULL,NULL,NULL,1,15,3),
(30,NULL,NULL,NULL,0,15,1),
(31,NULL,NULL,NULL,1,16,2),
(32,NULL,NULL,NULL,0,16,3),
(33,NULL,NULL,NULL,1,17,16),
(34,NULL,NULL,NULL,0,17,19),
(35,NULL,NULL,NULL,1,18,33),
(36,NULL,NULL,NULL,0,18,34),
(37,NULL,NULL,NULL,1,19,20),
(38,NULL,NULL,NULL,0,19,31),
(39,NULL,NULL,NULL,1,20,4),
(40,NULL,NULL,NULL,0,20,5),
(41,NULL,NULL,NULL,1,21,6),
(42,NULL,NULL,NULL,0,21,4),
(43,NULL,NULL,NULL,1,22,5),
(44,NULL,NULL,NULL,0,22,6),
(45,NULL,NULL,NULL,1,23,17),
(46,NULL,NULL,NULL,0,23,18),
(47,NULL,NULL,NULL,1,24,15),
(48,NULL,NULL,NULL,0,24,14);
/*!40000 ALTER TABLE `gamedays_gameresult` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-02-08 23:23:00
