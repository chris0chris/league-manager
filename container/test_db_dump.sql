/*M!999999\- enable the sandbox mode */
-- MariaDB dump 10.19  Distrib 10.11.11-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: leaguesphere_staging
-- ------------------------------------------------------
-- Source: gameday 633 from staging (leaguesphere@lehel.xyz)

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
-- Dumping data for table `gamedays_association`
--

LOCK TABLES `gamedays_association` WRITE;
/*!40000 ALTER TABLE `gamedays_association` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_association` (`id`, `abbr`, `name`) VALUES (3,'AFCVBW','Baden-Württemberg'),
(7,'AFCVN','Niedersachsen'),
(8,'AFCVNORD','Nord');
/*!40000 ALTER TABLE `gamedays_association` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_league`
--

LOCK TABLES `gamedays_league` WRITE;
/*!40000 ALTER TABLE `gamedays_league` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_league` (`id`, `name`) VALUES (1,'Süd');
/*!40000 ALTER TABLE `gamedays_league` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_season`
--

LOCK TABLES `gamedays_season` WRITE;
/*!40000 ALTER TABLE `gamedays_season` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_season` (`id`, `name`) VALUES (5,'2025');
/*!40000 ALTER TABLE `gamedays_season` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_team`
--

LOCK TABLES `gamedays_team` WRITE;
/*!40000 ALTER TABLE `gamedays_team` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_team` (`id`, `name`, `description`, `location`, `logo`, `association_id`) VALUES
(7,'Test Placeholder','Test Placeholder','','',NULL),
(8,'A1','A1','dummy','',NULL),
(9,'A2','A2','dummy','',NULL),
(10,'A3','A3','dummy','',NULL),
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
(24,'Greifs','1. ASC Badener Greifs','Baden','',3),
(31,'Gewinner HF2','Gewinner HF2','dummy','',NULL),
(32,'Gewinner P3','Gewinner P3','dummy','',NULL),
(33,'Verlierer HF1','Verlierer HF1','dummy','',NULL),
(34,'Verlierer HF2','Verlierer HF2','dummy','',NULL),
(35,'Verlierer P3','Verlierer P3','dummy','',NULL),
(36,'P4 Gruppe 1','P4 Gruppe 1','dummy','',NULL),
(218,'1FFCB','1. FFC Braunschweig e.V.','Braunschweig',NULL,7),
(252,'Ritterhude','1. ASC Ritterhude v. 1994 e.V.','Ritterhude',NULL,8),
(260,'Greifs2','1. ASC Badener Greifs II','Baden','',3),
(303,'Verlierer Spiel 3','Verlierer Spiel 3','dummy','',NULL),
(305,'Verlierer Spiel 4','Verlierer Spiel 4','dummy','',NULL),
(306,'Gewinner Spiel 3','Gewinner Spiel 3','dummy','',NULL),
(307,'Verlierer Spiel 5','Verlierer Spiel 5','dummy','',NULL),
(308,'Gewinner Spiel 5','Gewinner Spiel 5','dummy','',NULL),
(309,'Gewinner Spiel 4','Gewinner Spiel 4','dummy','',NULL),
(1000,'Bester P1','Bester P1','dummy','',NULL),
(1001,'Bester P2','Bester P2','dummy','',NULL),
(1002,'Bester Zweitplatzierter Gruppe 1+2','Bester Zweitplatzierter Gruppe 1+2','dummy','',NULL),
(1003,'Erster P2','Erster P2','dummy','',NULL),
(1004,'Gewinner HF 1','Gewinner HF 1','dummy','',NULL),
(1005,'Gewinner HF 2','Gewinner HF 2','dummy','',NULL),
(1006,'Gewinner P02','Gewinner P02','dummy','',NULL),
(1007,'Gewinner P10','Gewinner P10','dummy','',NULL),
(1008,'Gewinner P5','Gewinner P5','dummy','',NULL),
(1009,'Gewinner P7','Gewinner P7','dummy','',NULL),
(1010,'Gewinner PD 1','Gewinner PD 1','dummy','',NULL),
(1011,'Gewinner PD 2','Gewinner PD 2','dummy','',NULL),
(1012,'Gewinner PO1','Gewinner PO1','dummy','',NULL),
(1013,'Gewinner PO2','Gewinner PO2','dummy','',NULL),
(1014,'Gewinner Spiel 1','Gewinner Spiel 1','dummy','',NULL),
(1015,'Gewinner Spiel 2','Gewinner Spiel 2','dummy','',NULL),
(1016,'Gewinner Spiel 6','Gewinner Spiel 6','dummy','',NULL),
(1017,'Gewinner Spiel 7','Gewinner Spiel 7','dummy','',NULL),
(1018,'Gewinner Spiel 8','Gewinner Spiel 8','dummy','',NULL),
(1019,'Gewinner VF 1','Gewinner VF 1','dummy','',NULL),
(1020,'Gewinner VF 2','Gewinner VF 2','dummy','',NULL),
(1021,'Gewinner VF 3','Gewinner VF 3','dummy','',NULL),
(1022,'Gewinner VF 4','Gewinner VF 4','dummy','',NULL),
(1023,'P1 Gruppe 3','P1 Gruppe 3','dummy','',NULL),
(1024,'P2 Gruppe 3','P2 Gruppe 3','dummy','',NULL),
(1025,'P3 Gruppe 3','P3 Gruppe 3','dummy','',NULL),
(1026,'P3 Gruppe B','P3 Gruppe B','dummy','',NULL),
(1027,'P4 Gruppe 2','P4 Gruppe 2','dummy','',NULL),
(1028,'Schlechterer Zweitplatzierter Gruppe 1+2','Schlechterer Zweitplatzierter Gruppe 1+2','dummy','',NULL),
(1029,'Schlechtester P1','Schlechtester P1','dummy','',NULL),
(1030,'Schlechtester P2','Schlechtester P2','dummy','',NULL),
(1031,'Team Officials','Team Officials','dummy','',NULL),
(1032,'Verlierer HF','Verlierer HF','dummy','',NULL),
(1033,'Verlierer HF 1','Verlierer HF 1','dummy','',NULL),
(1034,'Verlierer HF 2','Verlierer HF 2','dummy','',NULL),
(1035,'Verlierer P10','Verlierer P10','dummy','',NULL),
(1036,'Verlierer P5','Verlierer P5','dummy','',NULL),
(1037,'Verlierer P7','Verlierer P7','dummy','',NULL),
(1038,'Verlierer PD 1','Verlierer PD 1','dummy','',NULL),
(1039,'Verlierer PD 2','Verlierer PD 2','dummy','',NULL),
(1040,'Verlierer PO1','Verlierer PO1','dummy','',NULL),
(1041,'Verlierer PO2','Verlierer PO2','dummy','',NULL),
(1042,'Verlierer Spiel 1','Verlierer Spiel 1','dummy','',NULL),
(1043,'Verlierer Spiel 2','Verlierer Spiel 2','dummy','',NULL),
(1044,'Verlierer Spiel 7','Verlierer Spiel 7','dummy','',NULL),
(1045,'Verlierer Spiel 8','Verlierer Spiel 8','dummy','',NULL),
(1046,'Verlierer VF 1','Verlierer VF 1','dummy','',NULL),
(1047,'Verlierer VF 2','Verlierer VF 2','dummy','',NULL),
(1048,'Verlierer VF 3','Verlierer VF 3','dummy','',NULL),
(1049,'Verlierer VF 4','Verlierer VF 4','dummy','',NULL),
(1050,'Zweitbester P1','Zweitbester P1','dummy','',NULL),
(1051,'Zweitbester P2','Zweitbester P2','dummy','',NULL),
(1052,'beste Rangfolge','beste Rangfolge','dummy','',NULL),
(1053,'schlechtere Rangfolge','schlechtere Rangfolge','dummy','',NULL);
/*!40000 ALTER TABLE `gamedays_team` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_gameday`
--

LOCK TABLES `gamedays_gameday` WRITE;
/*!40000 ALTER TABLE `gamedays_gameday` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_gameday` (`id`, `name`, `date`, `start`, `format`, `author_id`, `league_id`, `season_id`, `address`, `published_at`, `status`) VALUES (633,'Test','2026-03-10','10:00:00.000000','4_final4_1',1,1,5,'tbd',NULL,'DRAFT');
/*!40000 ALTER TABLE `gamedays_gameday` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_gameinfo`
--

LOCK TABLES `gamedays_gameinfo` WRITE;
/*!40000 ALTER TABLE `gamedays_gameinfo` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_gameinfo` (`id`, `scheduled`, `field`, `status`, `gameStarted`, `gameHalftime`, `gameFinished`, `stage`, `standing`, `gameday_id`, `officials_id`, `in_possession`, `league_group_id`) VALUES
(7269,'10:00:00.000000',1,'beendet','19:59:33.248375','19:59:41.806903','20:00:05.644230','Vorrunde','Spiel 1',633,252,'Greifs',NULL),
(7270,'11:10:00.000000',1,'beendet','20:00:27.842284','20:00:34.655475','20:00:44.056587','Vorrunde','Spiel 2',633,24,'Greifs2',NULL),
(7271,'12:20:00.000000',1,'beendet','20:01:14.863120','20:01:21.384161','20:01:25.845517','Finalrunde','Spiel 3',633,24,'Greifs2',NULL),
(7272,'13:30:00.000000',1,'Geplant',NULL,NULL,NULL,'Finalrunde','Spiel 4',633,260,NULL,NULL),
(7273,'14:40:00.000000',1,'Geplant',NULL,NULL,NULL,'Finalrunde','Spiel 5',633,303,NULL,NULL),
(7274,'15:50:00.000000',1,'Geplant',NULL,NULL,NULL,'Finalrunde','P1',633,307,NULL,NULL);
/*!40000 ALTER TABLE `gamedays_gameinfo` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping data for table `gamedays_gameresult`
--

LOCK TABLES `gamedays_gameresult` WRITE;
/*!40000 ALTER TABLE `gamedays_gameresult` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `gamedays_gameresult` (`id`, `fh`, `sh`, `pa`, `isHome`, `gameinfo_id`, `team_id`) VALUES
(14361,6,7,7,1,7269,24),
(14362,0,7,13,0,7269,218),
(14363,6,0,0,1,7270,252),
(14364,0,0,6,0,7270,260),
(14365,6,0,0,1,7271,218),
(14366,0,0,6,0,7271,260),
(14367,NULL,NULL,NULL,1,7272,24),
(14368,NULL,NULL,NULL,0,7272,252),
(14369,NULL,NULL,NULL,1,7273,305),
(14370,NULL,NULL,NULL,0,7273,306),
(14371,NULL,NULL,NULL,1,7274,308),
(14372,NULL,NULL,NULL,0,7274,309);
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

-- Dump completed on 2026-03-12 (gameday 633 from leaguesphere_staging)
