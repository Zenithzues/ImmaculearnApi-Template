-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 18, 2026 at 05:13 PM
-- Server version: 10.11.14-MariaDB-0ubuntu0.24.04.1
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `immaculearn_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `academic_term`
--

CREATE TABLE `academic_term` (
  `acad_term_id` int(11) NOT NULL,
  `acad_term_name` enum('PRELIM','MIDTERM','PREFINALS','FINALS') NOT NULL,
  `semester` int(11) NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `academic_status` enum('active','completed') NOT NULL DEFAULT 'active',
  `created_by` int(11) NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `academic_term`
--

INSERT INTO `academic_term` (`acad_term_id`, `acad_term_name`, `semester`, `academic_year`, `academic_status`, `created_by`, `updated_at`, `created_at`) VALUES
(1, 'PRELIM', 1, '2026-2027', 'completed', 1, '2026-02-28 16:11:35', '2026-02-27 15:11:50'),
(13, 'MIDTERM', 1, '2024-2025', 'active', 1, '2026-02-28 17:37:10', '2026-02-27 16:12:26');

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `account_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `bio` varchar(255) DEFAULT NULL,
  `google_id` varchar(255) NOT NULL,
  `profile_pic` text NOT NULL,
  `status` enum('online','offline') NOT NULL DEFAULT 'offline',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`account_id`, `email`, `password`, `bio`, `google_id`, `profile_pic`, `status`, `created_at`) VALUES
(1, 'wilsonesmabe2003@gmail.com', '$argon2id$v=19$m=131072,t=3,p=2$RUcyzDg5oWe8ToNTINOLRw$pmNY7PTTHD2VZLbkzv5QALTdzB9VGHRQSh1TzINUdRQ', NULL, '103575556967891244584', 'https://lh3.googleusercontent.com/a/ACg8ocKNKFJ1FbHXcY6qyfUBswAS3DKCKoqFnJ0gCFo-iDRVslo_Cjw=s96-c', 'online', '2025-12-17 17:09:21'),
(12, 'jhonditch72@gmail.com', '$argon2id$v=19$m=131072,t=3,p=2$RUcyzDg5oWe8ToNTINOLRw$pmNY7PTTHD2VZLbkzv5QALTdzB9VGHRQSh1TzINUdRQ', NULL, '116034724116533085576', 'https://lh3.googleusercontent.com/a/ACg8ocKYuFWwaCl-fkHACM9xrj7YN1TtUvW3tqotwTbqhyoDzhAeSg=s96-c', 'online', '2026-01-07 02:01:17'),
(22, 'galvez.raecellann@gmail.com', '$argon2id$v=19$m=131072,t=3,p=2$eSPlQkPIA9CKsYzNn/G/pQ$dVswb1VkFbgz/wJB+xE8pT5vuFn8jO/aBJKswwOrPh0', NULL, '102456735955143515364', 'https://lh3.googleusercontent.com/a/ACg8ocKralq3yXRaW681TddWTOWZIByRnGnnnjWcLv2fHqWVSafWkMY=s96-c', 'offline', '2026-01-30 05:06:28'),
(23, 'faboradanathaniel@gmail.com', '$argon2id$v=19$m=131072,t=3,p=2$qJf4P+NSnhETkY6blohgmA$lfyUoCJmqDv1+5qOyBieXi082PlWBHAw4WQ7DMEhR4g', NULL, '115767732478965045072', 'https://lh3.googleusercontent.com/a/ACg8ocKDaXzIak8uAhZzoRAtzs3nMB81sAtf5cs4hO-ANZRhuKul8Znr=s96-c', 'online', '2026-01-30 05:15:31'),
(24, 'howiegallardo@gmail.com', '$argon2id$v=19$m=131072,t=3,p=2$qbCB5ZcqkTWsAui//yilSA$zwsUcgvkMjGRHMQunN8I2faJqBex+G8VEEu/x6qYnuI', NULL, '102607242527336022637', 'https://lh3.googleusercontent.com/a/ACg8ocIDQe9jdB4_VpQLD26Z1bTdG-Cj6kjQSlXOGANrPzE5FyHFKfI=s96-c', 'online', '2026-01-30 05:25:36');

-- --------------------------------------------------------

--
-- Table structure for table `admin_account`
--

CREATE TABLE `admin_account` (
  `admin_id` int(11) NOT NULL,
  `admin_email` varchar(100) NOT NULL,
  `admin_password` varchar(255) NOT NULL,
  `admin_fullname` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_account`
--

INSERT INTO `admin_account` (`admin_id`, `admin_email`, `admin_password`, `admin_fullname`, `created_at`) VALUES
(1, 'immaculearn@gmail.com', '$argon2id$v=19$m=131072,t=3,p=2$RUcyzDg5oWe8ToNTINOLRw$pmNY7PTTHD2VZLbkzv5QALTdzB9VGHRQSh1TzINUdRQ', 'Admin Admin', '2026-02-25 09:57:34');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `announce_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `target_audience` enum('ALL','STUDENTS','TEACHERS') DEFAULT 'ALL',
  `publish_option` enum('NOW','SCHEDULED') DEFAULT 'NOW',
  `scheduled_at` datetime DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcement_images`
--

CREATE TABLE `announcement_images` (
  `image_id` int(11) NOT NULL,
  `announce_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcement_viewers`
--

CREATE TABLE `announcement_viewers` (
  `viewer_id` int(11) NOT NULL,
  `announce_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `viewed_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_spaces`
--

CREATE TABLE `course_spaces` (
  `c_space_id` int(11) NOT NULL,
  `acad_term_id` int(11) NOT NULL,
  `c_space_uuid` char(36) NOT NULL,
  `c_space_name` varchar(100) NOT NULL,
  `c_space_description` varchar(100) DEFAULT NULL,
  `c_space_cover` varchar(500) DEFAULT NULL,
  `c_space_day` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `c_space_time_start` time NOT NULL,
  `c_space_time_end` time NOT NULL,
  `c_space_yr_lvl` int(11) NOT NULL,
  `c_space_section` char(1) NOT NULL,
  `c_space_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`c_space_settings`)),
  `is_archive` tinyint(1) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `course_spaces`
--


-- --------------------------------------------------------

--
-- Table structure for table `files`
--

CREATE TABLE `files` (
  `file_id` int(11) NOT NULL,
  `space_id` int(11) DEFAULT NULL,
  `c_space_id` int(11) DEFAULT NULL,
  `lesson_id` int(11) NOT NULL,
  `orig_file_name` varchar(100) NOT NULL,
  `file_url` text NOT NULL,
  `storage_path` varchar(255) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `file_mimetype` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `files`
--


-- --------------------------------------------------------

--
-- Table structure for table `lessons`
--

CREATE TABLE `lessons` (
  `lesson_id` int(11) NOT NULL,
  `acad_term_id` int(11) NOT NULL,
  `c_space_id` int(11) DEFAULT NULL,
  `space_id` int(11) DEFAULT NULL,
  `lesson_name` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lessons`
--

-- --------------------------------------------------------

--
-- Table structure for table `post`
--

CREATE TABLE `post` (
  `post_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `space_id` int(11) DEFAULT NULL,
  `c_space_id` int(11) DEFAULT NULL,
  `post_content` varchar(255) NOT NULL,
  `parent_id` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `professors`
--

CREATE TABLE `professors` (
  `prof_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `prof_fn` varchar(50) NOT NULL,
  `prof_ln` varchar(50) NOT NULL,
  `prof_bd` date NOT NULL,
  `prof_gender` enum('M','F') NOT NULL,
  `prof_department` varchar(10) NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `professors`
--

INSERT INTO `professors` (`prof_id`, `account_id`, `prof_fn`, `prof_ln`, `prof_bd`, `prof_gender`, `prof_department`, `updated_at`, `created_at`) VALUES
(2, 1, 'Wilson', 'Esmabe', '2003-11-29', 'M', 'BSCS', '2026-03-13 03:55:42', '2026-03-13 03:55:42');

-- --------------------------------------------------------

--
-- Table structure for table `registered_prof_emails`
--

CREATE TABLE `registered_prof_emails` (
  `email` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registered_prof_emails`
--

INSERT INTO `registered_prof_emails` (`email`) VALUES
('wilsonesmabe2003@gmail.com');

-- --------------------------------------------------------

--
-- Table structure for table `registered_student_emails`
--

CREATE TABLE `registered_student_emails` (
  `email` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registered_student_emails`
--

INSERT INTO `registered_student_emails` (`email`) VALUES
('akoto@gmail.com'),
('esmabe.samuel@gmail.com'),
('faboradanathaniel@gmail.com'),
('galvez.raecellann@gmail.com'),
('helloworld@gmail.com'),
('howiegallardo@gmail.com'),
('jhonditch72@gmail.com'),
('raecellanndomingogalvez@gmail.com'),
('zeldrickjoaquin@gmail.com');

-- --------------------------------------------------------

--
-- Table structure for table `remarks`
--

CREATE TABLE `remarks` (
  `remark_id` int(11) NOT NULL,
  `acad_term_id` int(11) NOT NULL,
  `c_space_id` int(11) NOT NULL,
  `prof_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `prelim` decimal(5,2) DEFAULT NULL,
  `midterm` decimal(5,2) DEFAULT NULL,
  `prefinals` decimal(5,2) DEFAULT NULL,
  `finals` decimal(5,2) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `spaces`
--

CREATE TABLE `spaces` (
  `space_id` int(11) NOT NULL,
  `space_uuid` char(36) NOT NULL,
  `space_name` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `space_cover` varchar(500) DEFAULT NULL,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`settings`)),
  `space_type` enum('normal','course') NOT NULL DEFAULT 'normal',
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `spaces`
--

-- --------------------------------------------------------

--
-- Table structure for table `space_invitations`
--

CREATE TABLE `space_invitations` (
  `invitation_id` int(11) NOT NULL,
  `space_id` int(11) DEFAULT NULL,
  `c_space_id` int(11) DEFAULT NULL,
  `invited_account_id` int(11) DEFAULT NULL,
  `invited_email` varchar(100) DEFAULT NULL,
  `invited_by_account_id` int(11) DEFAULT NULL,
  `join_type` enum('direct','link_request') NOT NULL DEFAULT 'direct',
  `invitation_status` enum('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
  `invited_at` datetime NOT NULL DEFAULT current_timestamp(),
  `accepted_at` datetime DEFAULT NULL,
  `owner_approved_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `space_invitations`
--

-- --------------------------------------------------------

--
-- Table structure for table `space_members`
--

CREATE TABLE `space_members` (
  `smem_id` int(11) NOT NULL,
  `space_id` int(11) DEFAULT NULL,
  `c_space_id` int(11) DEFAULT NULL,
  `account_id` int(11) NOT NULL,
  `status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  `added_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `space_members`
--

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `student_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `student_fn` varchar(50) NOT NULL,
  `student_ln` varchar(50) NOT NULL,
  `student_bd` date NOT NULL,
  `student_gender` enum('M','F') NOT NULL,
  `student_course` varchar(10) NOT NULL,
  `student_yr_lvl` int(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`student_id`, `account_id`, `student_fn`, `student_ln`, `student_bd`, `student_gender`, `student_course`, `student_yr_lvl`, `created_at`) VALUES
(2, 12, 'Jhon', 'Ditch', '2003-11-29', 'M', 'BSCS', 4, '2026-01-12 14:55:42'),
(5, 22, 'raecell', 'galvez', '2003-01-01', 'F', 'BSCS', 2, '2026-01-30 13:06:50'),
(6, 23, 'NATH', 'FAB', '2004-04-05', 'M', 'BSCS', 4, '2026-01-30 13:16:14'),
(7, 24, 'Izyne', 'Gallardo', '2003-06-10', 'M', 'BSCS', 4, '2026-01-30 13:26:24');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `task_id` int(11) NOT NULL,
  `space_id` int(11) DEFAULT NULL,
  `c_space_id` int(11) DEFAULT NULL,
  `task_category` varchar(50) NOT NULL,
  `task_title` varchar(255) NOT NULL,
  `task_instruction` varchar(500) DEFAULT NULL,
  `lesson_id` int(11) DEFAULT NULL,
  `total_items_score` int(11) NOT NULL DEFAULT 0,
  `due_date` timestamp NOT NULL,
  `task_start` time DEFAULT NULL,
  `task_end` time DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

-- --------------------------------------------------------

--
-- Table structure for table `task_answers`
--

CREATE TABLE `task_answers` (
  `answer_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `choice_id` int(11) DEFAULT NULL,
  `answer_text` varchar(900) DEFAULT NULL,
  `answered_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_answers`
--

-- --------------------------------------------------------

--
-- Table structure for table `task_choices`
--

CREATE TABLE `task_choices` (
  `choice_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `letter_identifier` char(1) DEFAULT NULL,
  `choice_answer` varchar(255) NOT NULL,
  `is_right_answer` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_choices`
--

-- --------------------------------------------------------

--
-- Table structure for table `task_groups`
--

CREATE TABLE `task_groups` (
  `group_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `group_name` varchar(10) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_groups`
--

-- --------------------------------------------------------

--
-- Table structure for table `task_group_members`
--

CREATE TABLE `task_group_members` (
  `group_member_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `member_role` set('leader','member') NOT NULL DEFAULT 'member',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_group_members`
--

-- --------------------------------------------------------

--
-- Table structure for table `task_questions`
--

CREATE TABLE `task_questions` (
  `question_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `group_id` int(11) DEFAULT NULL,
  `question_type` varchar(50) NOT NULL,
  `question` varchar(255) NOT NULL,
  `identification_answer` varchar(100) DEFAULT NULL,
  `point` int(11) NOT NULL DEFAULT 1,
  `position` int(11) NOT NULL,
  `expected_count` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_questions`
--

-- --------------------------------------------------------

--
-- Table structure for table `task_question_groups`
--

CREATE TABLE `task_question_groups` (
  `group_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `group_lable` varchar(10) NOT NULL,
  `group_instruction` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_question_groups`
--

-- --------------------------------------------------------

--
-- Table structure for table `task_question_score`
--

CREATE TABLE `task_question_score` (
  `question_score_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  `score` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_question_score`
--

-- --------------------------------------------------------

--
-- Table structure for table `task_score`
--

CREATE TABLE `task_score` (
  `task_score_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `score` int(11) NOT NULL DEFAULT 0,
  `max_score` int(11) NOT NULL DEFAULT 0,
  `submitted_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_score`
--

-- --------------------------------------------------------

--
-- Table structure for table `tokens`
--

CREATE TABLE `tokens` (
  `token_id` int(11) NOT NULL,
  `account_id` int(11) DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `refresh_token` varchar(512) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tokens`
--

--
-- Indexes for dumped tables
--

--
-- Indexes for table `academic_term`
--
ALTER TABLE `academic_term`
  ADD PRIMARY KEY (`acad_term_id`),
  ADD UNIQUE KEY `acad_term_name` (`acad_term_name`,`semester`,`academic_year`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `admin_account`
--
ALTER TABLE `admin_account`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `admin_email` (`admin_email`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`announce_id`),
  ADD KEY `idx_target` (`target_audience`),
  ADD KEY `idx_published` (`is_published`),
  ADD KEY `idx_schedule` (`scheduled_at`);

--
-- Indexes for table `announcement_images`
--
ALTER TABLE `announcement_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `announce_id` (`announce_id`);

--
-- Indexes for table `announcement_viewers`
--
ALTER TABLE `announcement_viewers`
  ADD PRIMARY KEY (`viewer_id`),
  ADD KEY `announce_id` (`announce_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `course_spaces`
--
ALTER TABLE `course_spaces`
  ADD PRIMARY KEY (`c_space_id`),
  ADD UNIQUE KEY `c_space_uuid` (`c_space_uuid`),
  ADD UNIQUE KEY `c_space_day` (`c_space_day`,`c_space_time_start`,`c_space_time_end`,`c_space_yr_lvl`,`c_space_section`,`created_by`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `acad_term_id` (`acad_term_id`);

--
-- Indexes for table `files`
--
ALTER TABLE `files`
  ADD PRIMARY KEY (`file_id`),
  ADD KEY `c_space_id` (`c_space_id`),
  ADD KEY `space_id` (`space_id`),
  ADD KEY `files_ibfk_2` (`lesson_id`);

--
-- Indexes for table `lessons`
--
ALTER TABLE `lessons`
  ADD PRIMARY KEY (`lesson_id`),
  ADD KEY `acad_term_id` (`acad_term_id`),
  ADD KEY `c_space_id` (`c_space_id`),
  ADD KEY `space_id` (`space_id`);

--
-- Indexes for table `post`
--
ALTER TABLE `post`
  ADD PRIMARY KEY (`post_id`),
  ADD KEY `space_id` (`space_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `c_space_id` (`c_space_id`);

--
-- Indexes for table `professors`
--
ALTER TABLE `professors`
  ADD PRIMARY KEY (`prof_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `registered_prof_emails`
--
ALTER TABLE `registered_prof_emails`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `registered_student_emails`
--
ALTER TABLE `registered_student_emails`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `remarks`
--
ALTER TABLE `remarks`
  ADD PRIMARY KEY (`remark_id`),
  ADD KEY `c_space_id` (`c_space_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `prof_id` (`prof_id`),
  ADD KEY `acad_term_id` (`acad_term_id`);

--
-- Indexes for table `spaces`
--
ALTER TABLE `spaces`
  ADD PRIMARY KEY (`space_id`),
  ADD UNIQUE KEY `space_uuid` (`space_uuid`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `space_invitations`
--
ALTER TABLE `space_invitations`
  ADD PRIMARY KEY (`invitation_id`),
  ADD KEY `idx_space_id` (`space_id`),
  ADD KEY `idx_invited_account_id` (`invited_account_id`),
  ADD KEY `idx_invitation_status` (`invitation_status`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `fk_invited_by_account` (`invited_by_account_id`),
  ADD KEY `c_space_id` (`c_space_id`);

--
-- Indexes for table `space_members`
--
ALTER TABLE `space_members`
  ADD PRIMARY KEY (`smem_id`),
  ADD UNIQUE KEY `space_id` (`space_id`,`account_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `course_space_id` (`c_space_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`student_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`task_id`),
  ADD KEY `space_id` (`space_id`),
  ADD KEY `c_space_id` (`c_space_id`),
  ADD KEY `lesson_id` (`lesson_id`);

--
-- Indexes for table `task_answers`
--
ALTER TABLE `task_answers`
  ADD PRIMARY KEY (`answer_id`),
  ADD UNIQUE KEY `uniq_answer` (`task_id`,`question_id`,`account_id`),
  ADD KEY `question_id` (`question_id`),
  ADD KEY `choice_id` (`choice_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `idx_answers_task_account` (`task_id`,`account_id`);

--
-- Indexes for table `task_choices`
--
ALTER TABLE `task_choices`
  ADD PRIMARY KEY (`choice_id`),
  ADD UNIQUE KEY `uq_question_letter` (`question_id`,`letter_identifier`);

--
-- Indexes for table `task_groups`
--
ALTER TABLE `task_groups`
  ADD PRIMARY KEY (`group_id`),
  ADD KEY `task_id` (`task_id`);

--
-- Indexes for table `task_group_members`
--
ALTER TABLE `task_group_members`
  ADD PRIMARY KEY (`group_member_id`);

--
-- Indexes for table `task_questions`
--
ALTER TABLE `task_questions`
  ADD PRIMARY KEY (`question_id`),
  ADD KEY `fk_task_questions_task` (`task_id`),
  ADD KEY `group_id` (`group_id`);

--
-- Indexes for table `task_question_groups`
--
ALTER TABLE `task_question_groups`
  ADD PRIMARY KEY (`group_id`),
  ADD KEY `task_id` (`task_id`);

--
-- Indexes for table `task_question_score`
--
ALTER TABLE `task_question_score`
  ADD PRIMARY KEY (`question_score_id`),
  ADD UNIQUE KEY `uniq_question_score` (`task_id`,`question_id`,`account_id`),
  ADD KEY `question_id` (`question_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `idx_question_score_task_account` (`task_id`,`account_id`);

--
-- Indexes for table `task_score`
--
ALTER TABLE `task_score`
  ADD PRIMARY KEY (`task_score_id`),
  ADD UNIQUE KEY `uniq_task_score` (`task_id`,`account_id`),
  ADD KEY `account_id` (`account_id`);

--
-- Indexes for table `tokens`
--
ALTER TABLE `tokens`
  ADD PRIMARY KEY (`token_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `academic_term`
--
ALTER TABLE `academic_term`
  MODIFY `acad_term_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `admin_account`
--
ALTER TABLE `admin_account`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `announce_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `announcement_images`
--
ALTER TABLE `announcement_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `announcement_viewers`
--
ALTER TABLE `announcement_viewers`
  MODIFY `viewer_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_spaces`
--
ALTER TABLE `course_spaces`
  MODIFY `c_space_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `files`
--
ALTER TABLE `files`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `lessons`
--
ALTER TABLE `lessons`
  MODIFY `lesson_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `post`
--
ALTER TABLE `post`
  MODIFY `post_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `professors`
--
ALTER TABLE `professors`
  MODIFY `prof_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `remarks`
--
ALTER TABLE `remarks`
  MODIFY `remark_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `spaces`
--
ALTER TABLE `spaces`
  MODIFY `space_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=113;

--
-- AUTO_INCREMENT for table `space_invitations`
--
ALTER TABLE `space_invitations`
  MODIFY `invitation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- AUTO_INCREMENT for table `space_members`
--
ALTER TABLE `space_members`
  MODIFY `smem_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=133;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `task_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `task_answers`
--
ALTER TABLE `task_answers`
  MODIFY `answer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- AUTO_INCREMENT for table `task_choices`
--
ALTER TABLE `task_choices`
  MODIFY `choice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=249;

--
-- AUTO_INCREMENT for table `task_groups`
--
ALTER TABLE `task_groups`
  MODIFY `group_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `task_group_members`
--
ALTER TABLE `task_group_members`
  MODIFY `group_member_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `task_questions`
--
ALTER TABLE `task_questions`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=159;

--
-- AUTO_INCREMENT for table `task_question_groups`
--
ALTER TABLE `task_question_groups`
  MODIFY `group_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `task_question_score`
--
ALTER TABLE `task_question_score`
  MODIFY `question_score_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `task_score`
--
ALTER TABLE `task_score`
  MODIFY `task_score_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `tokens`
--
ALTER TABLE `tokens`
  MODIFY `token_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `academic_term`
--
ALTER TABLE `academic_term`
  ADD CONSTRAINT `academic_term_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `admin_account` (`admin_id`) ON DELETE CASCADE;

--
-- Constraints for table `announcement_images`
--
ALTER TABLE `announcement_images`
  ADD CONSTRAINT `announcement_images_ibfk_1` FOREIGN KEY (`announce_id`) REFERENCES `announcements` (`announce_id`) ON DELETE CASCADE;

--
-- Constraints for table `announcement_viewers`
--
ALTER TABLE `announcement_viewers`
  ADD CONSTRAINT `announcement_viewers_ibfk_1` FOREIGN KEY (`announce_id`) REFERENCES `announcements` (`announce_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `announcement_viewers_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `course_spaces`
--
ALTER TABLE `course_spaces`
  ADD CONSTRAINT `course_spaces_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_spaces_ibfk_2` FOREIGN KEY (`acad_term_id`) REFERENCES `academic_term` (`acad_term_id`) ON DELETE CASCADE;

--
-- Constraints for table `files`
--
ALTER TABLE `files`
  ADD CONSTRAINT `files_ibfk_1` FOREIGN KEY (`c_space_id`) REFERENCES `course_spaces` (`c_space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `files_ibfk_2` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `files_ibfk_4` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `files_ibfk_5` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE CASCADE;

--
-- Constraints for table `lessons`
--
ALTER TABLE `lessons`
  ADD CONSTRAINT `lessons_ibfk_1` FOREIGN KEY (`acad_term_id`) REFERENCES `academic_term` (`acad_term_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lessons_ibfk_2` FOREIGN KEY (`c_space_id`) REFERENCES `course_spaces` (`c_space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lessons_ibfk_3` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE;

--
-- Constraints for table `post`
--
ALTER TABLE `post`
  ADD CONSTRAINT `post_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_ibfk_2` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_ibfk_3` FOREIGN KEY (`c_space_id`) REFERENCES `course_spaces` (`c_space_id`) ON DELETE CASCADE;

--
-- Constraints for table `professors`
--
ALTER TABLE `professors`
  ADD CONSTRAINT `professors_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `remarks`
--
ALTER TABLE `remarks`
  ADD CONSTRAINT `remarks_ibfk_1` FOREIGN KEY (`c_space_id`) REFERENCES `course_spaces` (`c_space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `remarks_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `remarks_ibfk_3` FOREIGN KEY (`prof_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `remarks_ibfk_4` FOREIGN KEY (`acad_term_id`) REFERENCES `academic_term` (`acad_term_id`) ON DELETE CASCADE;

--
-- Constraints for table `spaces`
--
ALTER TABLE `spaces`
  ADD CONSTRAINT `spaces_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `space_invitations`
--
ALTER TABLE `space_invitations`
  ADD CONSTRAINT `fk_invite_space` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_invited_account` FOREIGN KEY (`invited_account_id`) REFERENCES `accounts` (`account_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_invited_by_account` FOREIGN KEY (`invited_by_account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `space_invitations_ibfk_1` FOREIGN KEY (`c_space_id`) REFERENCES `course_spaces` (`c_space_id`) ON DELETE CASCADE;

--
-- Constraints for table `space_members`
--
ALTER TABLE `space_members`
  ADD CONSTRAINT `space_members_ibfk_1` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `space_members_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `space_members_ibfk_3` FOREIGN KEY (`c_space_id`) REFERENCES `course_spaces` (`c_space_id`) ON DELETE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`space_id`) REFERENCES `spaces` (`space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`c_space_id`) REFERENCES `course_spaces` (`c_space_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`lesson_id`) ON DELETE CASCADE;

--
-- Constraints for table `task_answers`
--
ALTER TABLE `task_answers`
  ADD CONSTRAINT `task_answers_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`task_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `task_questions` (`question_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_answers_ibfk_3` FOREIGN KEY (`choice_id`) REFERENCES `task_choices` (`choice_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `task_answers_ibfk_4` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `task_choices`
--
ALTER TABLE `task_choices`
  ADD CONSTRAINT `fk_task_choices_question` FOREIGN KEY (`question_id`) REFERENCES `task_questions` (`question_id`) ON DELETE CASCADE;

--
-- Constraints for table `task_groups`
--
ALTER TABLE `task_groups`
  ADD CONSTRAINT `task_groups_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`task_id`) ON DELETE CASCADE;

--
-- Constraints for table `task_questions`
--
ALTER TABLE `task_questions`
  ADD CONSTRAINT `fk_task_questions_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`task_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_questions_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `task_question_groups` (`group_id`) ON DELETE CASCADE;

--
-- Constraints for table `task_question_groups`
--
ALTER TABLE `task_question_groups`
  ADD CONSTRAINT `task_question_groups_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`task_id`) ON DELETE CASCADE;

--
-- Constraints for table `task_question_score`
--
ALTER TABLE `task_question_score`
  ADD CONSTRAINT `task_question_score_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`task_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_question_score_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `task_questions` (`question_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_question_score_ibfk_3` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `task_score`
--
ALTER TABLE `task_score`
  ADD CONSTRAINT `task_score_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`task_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_score_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE;

--
-- Constraints for table `tokens`
--
ALTER TABLE `tokens`
  ADD CONSTRAINT `tokens_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tokens_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admin_account` (`admin_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
