/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: metro.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `account_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bio` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `profile_pic` text COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('online','offline') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'offline',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES
(1,'wilsonesmabe2003@gmail.com',NULL,NULL,'103575556967891244584','https://lh3.googleusercontent.com/a/ACg8ocKNKFJ1FbHXcY6qyfUBswAS3DKCKoqFnJ0gCFo-iDRVslo_Cjw=s96-c','online','2025-12-17 17:09:21'),
(11,'zeldrickjoaquin@gmail.com',NULL,NULL,'102758199116767937238','https://lh3.googleusercontent.com/a/ACg8ocIpgSGwkDrLqNVuYuwszR48gzdkzvqVdsIpLtw2B-nAS-H3Qi0=s96-c','offline','2026-01-07 01:26:12'),
(12,'jhonditch72@gmail.com',NULL,NULL,'116034724116533085576','https://lh3.googleusercontent.com/a/ACg8ocKYuFWwaCl-fkHACM9xrj7YN1TtUvW3tqotwTbqhyoDzhAeSg=s96-c','online','2026-01-07 02:01:17');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `professors`
--

DROP TABLE IF EXISTS `professors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `professors` (
  `prof_id` int NOT NULL AUTO_INCREMENT,
  `account_id` int NOT NULL,
  `prof_fn` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `prof_ln` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `prof_bd` date NOT NULL,
  `prof_gender` enum('M','F') COLLATE utf8mb4_general_ci NOT NULL,
  `prof_department` varchar(5) COLLATE utf8mb4_general_ci NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`prof_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `professors_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `professors`
--

LOCK TABLES `professors` WRITE;
/*!40000 ALTER TABLE `professors` DISABLE KEYS */;
INSERT INTO `professors` VALUES
(1,1,'wilson','esmabe','2003-11-29','M','BSCS','2025-12-23 19:03:25','2025-12-23 19:03:25');
/*!40000 ALTER TABLE `professors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registered_prof_emails`
--

DROP TABLE IF EXISTS `registered_prof_emails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `registered_prof_emails` (
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registered_prof_emails`
--

LOCK TABLES `registered_prof_emails` WRITE;
/*!40000 ALTER TABLE `registered_prof_emails` DISABLE KEYS */;
INSERT INTO `registered_prof_emails` VALUES
('wilsonesmabe2003@gmail.com');
/*!40000 ALTER TABLE `registered_prof_emails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registered_student_emails`
--

DROP TABLE IF EXISTS `registered_student_emails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `registered_student_emails` (
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registered_student_emails`
--

LOCK TABLES `registered_student_emails` WRITE;
/*!40000 ALTER TABLE `registered_student_emails` DISABLE KEYS */;
INSERT INTO `registered_student_emails` VALUES
('faboradanathaniel@gmail.com'),
('jhonditch72@gmail.com'),
('raecellanndomingogalvez@gmail.com'),
('zeldrickjoaquin@gmail.com');
/*!40000 ALTER TABLE `registered_student_emails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `space_members`
--

DROP TABLE IF EXISTS `space_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `space_members` (
  `smem_id` int NOT NULL AUTO_INCREMENT,
  `space_id` int NOT NULL,
  `account_id` int NOT NULL,
  `status` enum('pending','accepted','declined') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `added_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`smem_id`),
  KEY `space_id` (`space_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `space_members_ibfk_1` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE,
  CONSTRAINT `space_members_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `space_members`
--

LOCK TABLES `space_members` WRITE;
/*!40000 ALTER TABLE `space_members` DISABLE KEYS */;
INSERT INTO `space_members` VALUES
(1,30,11,'accepted','2026-01-08 12:37:47'),
(2,30,12,'accepted','2026-01-08 12:37:48');
/*!40000 ALTER TABLE `space_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `spaces`
--

DROP TABLE IF EXISTS `spaces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `spaces` (
  `space_id` int NOT NULL AUTO_INCREMENT,
  `space_uuid` char(36) COLLATE utf8mb4_general_ci NOT NULL,
  `space_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`space_id`),
  UNIQUE KEY `space_uuid` (`space_uuid`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `spaces_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `spaces`
--

LOCK TABLES `spaces` WRITE;
/*!40000 ALTER TABLE `spaces` DISABLE KEYS */;
INSERT INTO `spaces` VALUES
(30,'0f72f3c7-d5ab-11f0-b63c-c03532821bd5','activity ko to','',1,'2026-01-05 13:24:30'),
(31,'d90dadb2-d5ac-11f0-b63c-c03532821bd5','sana gumana auto refresh','',1,'2026-01-05 13:36:47'),
(32,'1ace62cc-d5af-11f0-b63c-c03532821bd5','gawa ko','',1,'2026-01-05 13:52:18'),
(33,'53339050-d5af-11f0-b63c-c03532821bd5','rhacel works','',1,'2026-01-05 13:53:49'),
(34,'ffedc267-d5c6-11f0-b63c-c03532821bd5','sana gumana na talaga','',1,'2026-01-06 13:18:58'),
(35,'50a77635-d5c7-11f0-b63c-c03532821bd5','goma goma na','',1,'2026-01-06 13:21:07'),
(36,'6e78bc5d-d5c7-11f0-b63c-c03532821bd5','goma goma','',1,'2026-01-06 13:21:56'),
(37,'948405e8-d5c7-11f0-b63c-c03532821bd5','goma goma naaa','',1,'2026-01-06 13:22:56'),
(38,'b32d29d0-d5d4-11f0-b63c-c03532821bd5','samsam','',1,'2026-01-06 16:31:16'),
(39,'272fe9c0-d5d8-11f0-b63c-c03532821bd5','sinubukan ulit para totoo','',1,'2026-01-06 19:58:12'),
(40,'d9d5a898-d5da-11f0-b63c-c03532821bd5','create space','',1,'2026-01-07 08:11:51'),
(41,'e09e4a9e-d5da-11f0-b63c-c03532821bd5','create space','',1,'2026-01-07 08:12:02'),
(42,'edf75c2c-d5da-11f0-b63c-c03532821bd5','sample','',1,'2026-01-07 08:12:25'),
(43,'097d7bf2-d5db-11f0-b63c-c03532821bd5','zeldrick','',1,'2026-01-07 08:13:11'),
(44,'7f02cc61-d5f0-11f0-b63c-c03532821bd5','My Activity 1','',12,'2026-01-07 11:11:19'),
(45,'b5d3c7ca-d631-11f0-b63c-c03532821bd5','internet of things','',1,'2026-01-08 12:53:22');
/*!40000 ALTER TABLE `spaces` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `student_id` int NOT NULL AUTO_INCREMENT,
  `account_id` int NOT NULL,
  `student_fn` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `student_ln` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `student_bd` date NOT NULL,
  `student_gender` enum('M','F') COLLATE utf8mb4_general_ci NOT NULL,
  `student_course` varchar(5) COLLATE utf8mb4_general_ci NOT NULL,
  `student_yr_lvl` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;


CREATE TABLE `tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('quiz','activity','project') NOT NULL DEFAULT 'activity',
  `is_group_task` TINYINT(1) NOT NULL DEFAULT 0,
  `start_date` DATETIME NULL,
  `due_date` DATETIME NULL,
  `total_score` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `task_groups`
--

CREATE TABLE `task_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `group_name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `task_groups_ibfk_1`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `task_group_members`
--

CREATE TABLE `task_group_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_group_id` BIGINT UNSIGNED NOT NULL,
  `student_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `task_group_id` (`task_group_id`),
  CONSTRAINT `task_group_members_ibfk_1`
    FOREIGN KEY (`task_group_id`) REFERENCES `task_groups` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `task_criteria`
--

CREATE TABLE `task_criteria` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `criteria_name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `max_score` DECIMAL(8,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `task_criteria_ibfk_1`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `task_forms`
--

CREATE TABLE `task_forms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `question_text` TEXT NOT NULL,
  `question_type` ENUM('multiple_choice','essay','file_upload') NOT NULL,
  `points` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `task_forms_ibfk_1`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `task_form_options`
--

CREATE TABLE `task_form_options` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_form_id` BIGINT UNSIGNED NOT NULL,
  `option_text` VARCHAR(255) NOT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `task_form_id` (`task_form_id`),
  CONSTRAINT `task_form_options_ibfk_1`
    FOREIGN KEY (`task_form_id`) REFERENCES `task_forms` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `task_submissions`
--

CREATE TABLE `task_submissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `student_id` BIGINT UNSIGNED NULL,
  `task_group_id` BIGINT UNSIGNED NULL,
  `submitted_at` DATETIME NULL,
  `score` DECIMAL(8,2) NULL,
  `feedback` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `task_group_id` (`task_group_id`),
  CONSTRAINT `task_submissions_ibfk_1`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `task_submissions_ibfk_2`
    FOREIGN KEY (`task_group_id`) REFERENCES `task_groups` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `token_id` int NOT NULL AUTO_INCREMENT,
  `account_id` int NOT NULL,
  `refresh_token` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `tokens_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens`
--

LOCK TABLES `tokens` WRITE;
/*!40000 ALTER TABLE `tokens` DISABLE KEYS */;
INSERT INTO `tokens` VALUES
(14,1,'299b69d0d1473f082141e6fea907e045d932e2cbdce788c33507990f9cef6907','2026-02-07 15:43:13','2026-01-02 23:01:48'),
(15,11,'8eafe851a6663629446e9a87ccc58ca146fa26874e714f7ee9438cadddf535d6','2026-02-06 09:28:00','2026-01-07 09:27:29'),
(16,12,'b87dbc1a633bfcf5dd2de4aba8cf7409b67956d3922e3b583e3a36d6eb353149','2026-02-07 12:44:50','2026-01-07 10:01:26');
/*!40000 ALTER TABLE `tokens` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-08 15:51:28
