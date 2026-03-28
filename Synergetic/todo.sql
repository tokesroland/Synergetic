-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1
-- Létrehozás ideje: 2026. Már 28. 01:06
-- Kiszolgáló verziója: 10.4.32-MariaDB
-- PHP verzió: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Adatbázis: `todo`
--

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `attachments`
--

CREATE TABLE `attachments` (
  `id` int(11) NOT NULL,
  `entry_id` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `original_name` varchar(255) NOT NULL DEFAULT '',
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `attachments`
--

INSERT INTO `attachments` (`id`, `entry_id`, `file_path`, `file_type`, `original_name`, `uploaded_at`) VALUES
(1, 6, 'uploads/attachments/6/05e61f544ebbf4037fd69ac577e7d6f4.png', 'image/png', 'Amuh_Futuristic_city_surrounded_by_wall_reside_in_other_planets_5a17c194-d224-48ee-9ec0-0c6123510092.png', '2026-03-26 22:41:46'),
(2, 6, 'uploads/attachments/6/7f14891f5aa5af9d09562f20cebde54a.png', 'image/png', 'Rolandvolnek_City_art_from_Stellaris_without_text_render_4k_2dfc311b-415e-4405-8139-c3703812ff36.png', '2026-03-26 22:41:49');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `color_hex` varchar(7) DEFAULT '#5c6bc0',
  `icon_name` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `categories`
--

INSERT INTO `categories` (`id`, `name`, `color_hex`, `icon_name`) VALUES
(1, 'Házifeladat', '#65421a', NULL),
(2, 'Edzés', '#5c6bc0', NULL),
(3, 'Projektmunka', '#1d2134', NULL);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `entries`
--

CREATE TABLE `entries` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `type` enum('note','todo','event') NOT NULL,
  `title` varchar(255) NOT NULL,
  `pos_x` float NOT NULL DEFAULT 400,
  `pos_y` float NOT NULL DEFAULT 300,
  `content` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `notified_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `entries`
--

INSERT INTO `entries` (`id`, `group_id`, `category_id`, `type`, `title`, `pos_x`, `pos_y`, `content`, `created_at`, `updated_at`, `notified_at`) VALUES
(1, 1, NULL, 'todo', 'asdadsasdadsasd', 400, 300, NULL, '2026-03-05 11:25:16', '2026-03-05 11:25:16', NULL),
(3, 1, NULL, 'todo', 'asdasdasd', 684, 478, NULL, '2026-03-05 11:39:09', '2026-03-05 11:39:09', NULL),
(4, 2, 1, 'note', 'Szakdolgozat', 912.841, 249.418, '- Kell valami\n- Még valami\n\naaasdasdasasdssdssad\n', '2026-03-05 11:39:27', '2026-03-26 21:40:59', NULL),
(5, 1, NULL, 'todo', 'asdadssadadsddasdas', 390, 123, NULL, '2026-03-05 11:39:42', '2026-03-05 11:39:42', NULL),
(6, 1, 1, 'event', 'Szakdolgozat témakörök', 434.12, 195.273, '<font size=\"4\">Telefon specifikaciok:</font><div><font size=\"4\">- 16GB ram</font></div><div><font size=\"4\">- 4 GB vram</font></div><div><font size=\"4\">- nem megy a brave</font></div><div><font size=\"4\"><br></font></div><div><font size=\"4\"><br></font></div><div><font size=\"4\">Sallang szöveg a jajajajajajjaj</font><span style=\"font-size: large; background-color: transparent;\">Telefon specifikaciok:</span></div><div><font size=\"4\">- 16GB ram</font></div><div><font size=\"4\">- 4 GB vram</font></div><div><font size=\"4\">- nem megy a brave</font></div><div><font size=\"4\"><br></font></div><div><font size=\"4\"><br></font></div><div><font size=\"4\">Sallang szöveg a jajajajajajjaj</font></div><div><font size=\"4\">Telefon specifikaciok:</font><div><font size=\"4\">- 16GB ram</font></div><div><font size=\"4\">- 4 GB vram</font></div><div><font size=\"4\">- nem megy a brave</font></div><div><font size=\"4\"><br></font></div><div><font size=\"4\"><br></font></div><div><font size=\"4\">Sallang szöveg a jajajajajajjaj</font><span style=\"font-size: large; background-color: transparent;\">Telefon specifikaciok:</span></div><div><font size=\"4\">- 16GB ram</font></div><div><font size=\"4\">- 4 GB vram</font></div><div><font size=\"4\">- nem megy a brave</font></div><div><font size=\"4\"><br></font></div><div><font size=\"4\"><br></font></div><div><font size=\"4\">Sallang szöveg a jajajajajajjaj</font></div></div>', '2026-03-05 11:40:01', '2026-03-27 23:58:29', NULL),
(7, 1, NULL, 'todo', 'adasdasddsasaddassdasadasddssadads', 112.547, 249.203, NULL, '2026-03-05 11:40:27', '2026-03-27 23:58:23', NULL),
(13, 2, NULL, 'event', 'asd', 534, 278, 'asdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', '2026-03-20 18:02:12', '2026-03-26 21:39:50', NULL),
(14, 2, NULL, 'note', 'fasz', 412, 309, NULL, '2026-03-20 18:02:25', '2026-03-26 21:30:17', NULL),
(15, 1, NULL, 'todo', 'ddd', 137, 431, NULL, '2026-03-20 18:02:42', '2026-03-20 18:02:42', NULL),
(20, 2, 2, 'event', '', 301, 329, NULL, '2026-03-20 18:03:45', '2026-03-27 23:23:56', NULL),
(21, 2, 2, 'note', 'a', 477, 205, 'sdaasdadasddsad<div>asdasdsad</div><div>adsasdddadsad</div>', '2026-03-20 18:08:14', '2026-03-26 21:38:09', NULL),
(22, 2, NULL, 'note', 'a', 488, 344, NULL, '2026-03-20 18:08:20', '2026-03-26 21:30:23', NULL),
(23, 1, NULL, 'todo', '23', 280, 251, NULL, '2026-03-20 18:08:37', '2026-03-20 18:08:37', NULL),
(24, 1, NULL, 'todo', 'Feladatok xddddd', 579, 291, NULL, '2026-03-23 09:27:40', '2026-03-27 23:59:11', NULL),
(27, 1, 2, 'event', 'Edzés FItness', 789.676, 286.131, NULL, '2026-03-27 23:26:29', '2026-03-27 23:56:50', NULL),
(28, 2, 2, 'note', 'a', 123, 270, NULL, '2026-03-27 23:39:01', '2026-03-27 23:39:01', NULL),
(29, 1, NULL, 'todo', 'd', 324.104, 388.015, NULL, '2026-03-27 23:39:11', '2026-03-27 23:59:15', NULL),
(30, 1, 2, 'todo', 'Kuki verés', 298, 132, NULL, '2026-03-27 23:48:31', '2026-03-27 23:48:31', NULL);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `entry_links`
--

CREATE TABLE `entry_links` (
  `source_id` int(11) NOT NULL,
  `target_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `entry_links`
--

INSERT INTO `entry_links` (`source_id`, `target_id`) VALUES
(4, 6),
(6, 27),
(7, 6),
(20, 21),
(21, 4);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `entry_tags`
--

CREATE TABLE `entry_tags` (
  `entry_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `entry_tags`
--

INSERT INTO `entry_tags` (`entry_id`, `tag_id`) VALUES
(4, 1),
(6, 1),
(6, 2),
(6, 3),
(6, 4),
(6, 5),
(6, 6),
(6, 7),
(13, 1);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `event_details`
--

CREATE TABLE `event_details` (
  `entry_id` int(11) NOT NULL,
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime DEFAULT NULL,
  `is_all_day` tinyint(1) DEFAULT 0,
  `location_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `event_details`
--

INSERT INTO `event_details` (`entry_id`, `start_datetime`, `end_datetime`, `is_all_day`, `location_id`) VALUES
(6, '2026-03-05 12:39:00', '2026-03-12 12:39:00', 0, NULL),
(13, '2026-03-20 00:00:00', NULL, 1, NULL),
(20, '2026-03-04 00:00:00', NULL, 0, NULL),
(27, '2026-03-28 00:00:00', NULL, 1, NULL);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `exceptions`
--

CREATE TABLE `exceptions` (
  `id` int(11) NOT NULL,
  `recurring_entry_id` int(11) NOT NULL,
  `original_datetime` datetime NOT NULL,
  `is_cancelled` tinyint(1) DEFAULT 0,
  `replacement_entry_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `groups`
--

CREATE TABLE `groups` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color_hex` varchar(7) DEFAULT '#5c6bc0',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `groups`
--

INSERT INTO `groups` (`id`, `name`, `description`, `color_hex`, `created_at`) VALUES
(1, 'Csoportosítatlan', 'Alapértelmezett csoport bejegyzéseknek', '#888888', '2026-03-05 10:25:23'),
(2, 'Projektek', 'Az összes céges projekt itt van.', '#000000', '2026-03-20 18:57:10');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `locations`
--

CREATE TABLE `locations` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `color_hex` varchar(7) DEFAULT '#888888'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `recurrences`
--

CREATE TABLE `recurrences` (
  `id` int(11) NOT NULL,
  `entry_id` int(11) NOT NULL,
  `frequency` enum('minute','hour','day','week','month','year') NOT NULL,
  `interval_value` int(11) DEFAULT 1,
  `until_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `routine_completions`
--

CREATE TABLE `routine_completions` (
  `id` int(11) NOT NULL,
  `routine_item_id` int(11) NOT NULL,
  `completed_date` date NOT NULL,
  `completed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `routine_completions`
--

INSERT INTO `routine_completions` (`id`, `routine_item_id`, `completed_date`, `completed_at`) VALUES
(6, 18, '2026-03-26', '2026-03-26 17:38:06'),
(7, 17, '2026-03-26', '2026-03-26 17:38:07'),
(8, 19, '2026-03-26', '2026-03-26 17:38:09'),
(10, 20, '2026-03-26', '2026-03-26 21:31:07');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `routine_items`
--

CREATE TABLE `routine_items` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('todo','event') NOT NULL DEFAULT 'todo',
  `category_id` int(11) DEFAULT NULL,
  `day_of_week` tinyint(1) NOT NULL COMMENT '1=Hétfő, 2=Kedd, ..., 7=Vasárnap',
  `start_time` time NOT NULL DEFAULT '08:00:00',
  `end_time` time NOT NULL DEFAULT '09:00:00',
  `color_hex` varchar(7) DEFAULT NULL COMMENT 'Egyedi szín (opcionális, ha nincs kategória)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `routine_items`
--

INSERT INTO `routine_items` (`id`, `title`, `type`, `category_id`, `day_of_week`, `start_time`, `end_time`, `color_hex`, `created_at`, `updated_at`) VALUES
(17, 'Suli', 'todo', NULL, 1, '12:15:00', '13:00:00', '#ffffff', '2026-03-26 17:17:35', '2026-03-26 17:17:35'),
(18, 'Suli', 'todo', NULL, 2, '09:25:00', '12:05:00', '#ffffff', '2026-03-26 17:18:32', '2026-03-26 17:18:32'),
(19, 'Suli', 'todo', NULL, 3, '08:30:00', '15:40:00', '#ffffff', '2026-03-26 17:19:34', '2026-03-26 17:19:34'),
(20, 'Suli', 'todo', NULL, 4, '07:40:00', '14:50:00', '#ffffff', '2026-03-26 17:20:00', '2026-03-26 17:20:00'),
(21, 'Suli', 'todo', NULL, 5, '12:15:00', '15:40:00', '#ffffff', '2026-03-26 17:20:25', '2026-03-26 17:20:25'),
(22, 'Backend képzés', 'todo', NULL, 5, '17:15:00', '20:00:00', '#2eb9ff', '2026-03-26 17:21:04', '2026-03-26 17:21:04'),
(23, 'Projektmunka', 'todo', 1, 7, '19:00:00', '20:00:00', '#d900ff', '2026-03-26 21:34:25', '2026-03-26 21:34:25'),
(24, 'Edzés', 'todo', 2, 1, '14:00:00', '15:00:00', '#06c61c', '2026-03-26 23:34:22', '2026-03-26 23:34:22'),
(25, 'Edzés', 'todo', 2, 2, '14:00:00', '15:00:00', '#06c61c', '2026-03-26 23:34:22', '2026-03-26 23:34:22'),
(27, 'Edzés', 'todo', 2, 7, '14:00:00', '15:00:00', '#06c61c', '2026-03-26 23:34:22', '2026-03-26 23:34:22');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `color_hex` varchar(7) DEFAULT '#888888'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `tags`
--

INSERT INTO `tags` (`id`, `name`, `color_hex`) VALUES
(1, 'Fejlesztés', '#4997a7'),
(2, 'Iskolai', '#ff9800'),
(3, 'Budapest', '#ff9800'),
(4, 'Folyó', '#ff9800'),
(5, 'Taco', '#ff9800'),
(6, 'Sajt', '#ff9800'),
(7, 'recept', '#ff9800');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `todo_details`
--

CREATE TABLE `todo_details` (
  `entry_id` int(11) NOT NULL,
  `status` enum('active','completed','archived') DEFAULT 'active',
  `planned_start` datetime DEFAULT NULL,
  `deadline` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `todo_details`
--

INSERT INTO `todo_details` (`entry_id`, `status`, `planned_start`, `deadline`) VALUES
(1, 'active', NULL, NULL),
(3, 'active', NULL, NULL),
(5, 'active', NULL, NULL),
(7, 'active', '2026-03-05 00:00:00', NULL),
(15, 'active', '2026-03-20 00:00:00', NULL),
(23, 'active', NULL, NULL),
(24, 'active', '2026-03-23 11:30:00', '2026-03-27 13:30:00'),
(29, 'active', '2026-03-28 00:39:00', NULL),
(30, 'active', '2026-03-26 00:48:00', '2026-04-04 00:48:00');

--
-- Indexek a kiírt táblákhoz
--

--
-- A tábla indexei `attachments`
--
ALTER TABLE `attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_entry_id` (`entry_id`);

--
-- A tábla indexei `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- A tábla indexei `entries`
--
ALTER TABLE `entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `group_id` (`group_id`),
  ADD KEY `entries_ibfk_cat` (`category_id`);

--
-- A tábla indexei `entry_links`
--
ALTER TABLE `entry_links`
  ADD PRIMARY KEY (`source_id`,`target_id`),
  ADD KEY `target_id` (`target_id`);

--
-- A tábla indexei `entry_tags`
--
ALTER TABLE `entry_tags`
  ADD PRIMARY KEY (`entry_id`,`tag_id`),
  ADD KEY `tag_id` (`tag_id`);

--
-- A tábla indexei `event_details`
--
ALTER TABLE `event_details`
  ADD PRIMARY KEY (`entry_id`),
  ADD KEY `fk_event_location` (`location_id`);

--
-- A tábla indexei `exceptions`
--
ALTER TABLE `exceptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recurring_entry_id` (`recurring_entry_id`),
  ADD KEY `replacement_entry_id` (`replacement_entry_id`);

--
-- A tábla indexei `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`id`);

--
-- A tábla indexei `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`id`);

--
-- A tábla indexei `recurrences`
--
ALTER TABLE `recurrences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `entry_id` (`entry_id`);

--
-- A tábla indexei `routine_completions`
--
ALTER TABLE `routine_completions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_date` (`routine_item_id`,`completed_date`);

--
-- A tábla indexei `routine_items`
--
ALTER TABLE `routine_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_routine_category` (`category_id`),
  ADD KEY `idx_day` (`day_of_week`);

--
-- A tábla indexei `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- A tábla indexei `todo_details`
--
ALTER TABLE `todo_details`
  ADD PRIMARY KEY (`entry_id`);

--
-- A kiírt táblák AUTO_INCREMENT értéke
--

--
-- AUTO_INCREMENT a táblához `attachments`
--
ALTER TABLE `attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT a táblához `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT a táblához `entries`
--
ALTER TABLE `entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT a táblához `exceptions`
--
ALTER TABLE `exceptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT a táblához `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=100;

--
-- AUTO_INCREMENT a táblához `locations`
--
ALTER TABLE `locations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT a táblához `recurrences`
--
ALTER TABLE `recurrences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT a táblához `routine_completions`
--
ALTER TABLE `routine_completions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT a táblához `routine_items`
--
ALTER TABLE `routine_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT a táblához `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Megkötések a kiírt táblákhoz
--

--
-- Megkötések a táblához `attachments`
--
ALTER TABLE `attachments`
  ADD CONSTRAINT `attachments_ibfk_1` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `entries`
--
ALTER TABLE `entries`
  ADD CONSTRAINT `entries_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `entries_ibfk_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Megkötések a táblához `entry_links`
--
ALTER TABLE `entry_links`
  ADD CONSTRAINT `entry_links_ibfk_1` FOREIGN KEY (`source_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `entry_links_ibfk_2` FOREIGN KEY (`target_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `entry_tags`
--
ALTER TABLE `entry_tags`
  ADD CONSTRAINT `entry_tags_ibfk_1` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `entry_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `event_details`
--
ALTER TABLE `event_details`
  ADD CONSTRAINT `event_details_ibfk_1` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_event_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL;

--
-- Megkötések a táblához `exceptions`
--
ALTER TABLE `exceptions`
  ADD CONSTRAINT `exceptions_ibfk_1` FOREIGN KEY (`recurring_entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `exceptions_ibfk_2` FOREIGN KEY (`replacement_entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `recurrences`
--
ALTER TABLE `recurrences`
  ADD CONSTRAINT `recurrences_ibfk_1` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `routine_completions`
--
ALTER TABLE `routine_completions`
  ADD CONSTRAINT `fk_completion_item` FOREIGN KEY (`routine_item_id`) REFERENCES `routine_items` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `routine_items`
--
ALTER TABLE `routine_items`
  ADD CONSTRAINT `fk_routine_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Megkötések a táblához `todo_details`
--
ALTER TABLE `todo_details`
  ADD CONSTRAINT `todo_details_ibfk_1` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
