-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1
-- Létrehozás ideje: 2026. Már 23. 18:21
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
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(2, 'Edzés', '#5c6bc0', NULL);

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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `entries`
--

INSERT INTO `entries` (`id`, `group_id`, `category_id`, `type`, `title`, `pos_x`, `pos_y`, `content`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'todo', 'asdadsasdadsasd', 400, 300, NULL, '2026-03-05 11:25:16', '2026-03-05 11:25:16'),
(3, 1, NULL, 'todo', 'asdasdasd', 684, 478, NULL, '2026-03-05 11:39:09', '2026-03-05 11:39:09'),
(4, 1, 1, 'note', 'Szakdolgozat', 873, 348, '- Kell valami\n- Még valami\n\naaasdasdasasdssdssad\n', '2026-03-05 11:39:27', '2026-03-23 16:55:05'),
(5, 1, NULL, 'todo', 'asdadssadadsddasdas', 390, 123, NULL, '2026-03-05 11:39:42', '2026-03-05 11:39:42'),
(6, 1, NULL, 'event', 'sadads', 1038, 459, 'aAAAAAAAAAAAAAAAAAAA\nasddassdas\nadasd\n\ndasadadsdaadsadsdsadsdsadasadadsdaadsadsdsadsdsa\ndasadadsdaadsadsdsadsdsa\ndasadadsdaadsadsdsadsdsadasadadsdaadsadsdsadsdsa', '2026-03-05 11:40:01', '2026-03-23 16:49:32'),
(7, 1, NULL, 'todo', 'adasdasddsasaddassdasadasddssadads', 297, 268, NULL, '2026-03-05 11:40:27', '2026-03-05 11:40:27'),
(9, 1, NULL, 'event', 'óra', 104, 241, NULL, '2026-03-10 17:30:09', '2026-03-10 17:30:09'),
(13, 1, NULL, 'event', 'asd', 297, 395, 'asdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', '2026-03-20 18:02:12', '2026-03-23 09:26:50'),
(14, 1, NULL, 'note', 'fasz', 698, 375, NULL, '2026-03-20 18:02:25', '2026-03-20 18:02:25'),
(15, 1, NULL, 'todo', 'ddd', 137, 431, NULL, '2026-03-20 18:02:42', '2026-03-20 18:02:42'),
(19, 1, NULL, 'event', 'dddddddddddddddddddd', 1287, 233, NULL, '2026-03-20 18:03:25', '2026-03-23 16:55:10'),
(20, 1, 2, 'event', 'fasfafafafafafaf', 645, 191, NULL, '2026-03-20 18:03:45', '2026-03-23 17:12:01'),
(21, 1, NULL, 'note', 'a', 1097, 164, NULL, '2026-03-20 18:08:14', '2026-03-23 16:53:37'),
(22, 1, NULL, 'note', 'a', 219, 268, NULL, '2026-03-20 18:08:20', '2026-03-20 18:08:20'),
(23, 1, NULL, 'todo', '23', 280, 251, NULL, '2026-03-20 18:08:37', '2026-03-20 18:08:37'),
(24, 1, NULL, 'todo', 'Feladatok xddddd', 449, 281, NULL, '2026-03-23 09:27:40', '2026-03-23 09:27:40');

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
(4, 19),
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
(9, '2026-03-11 00:00:00', NULL, 1, NULL),
(13, '2026-03-20 00:00:00', NULL, 1, NULL),
(19, '2026-04-02 00:00:00', NULL, 0, NULL),
(20, '2026-03-04 00:00:00', NULL, 0, NULL);

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
(1, 'Fejlesztés', '#4997a7');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `todo_details`
--

CREATE TABLE `todo_details` (
  `entry_id` int(11) NOT NULL,
  `status` enum('active','completed','archived') DEFAULT 'active',
  `start_datetime` datetime DEFAULT NULL,
  `end_datetime` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `todo_details`
--

INSERT INTO `todo_details` (`entry_id`, `status`, `start_datetime`, `end_datetime`) VALUES
(1, 'active', NULL, NULL),
(3, 'active', NULL, NULL),
(5, 'active', NULL, NULL),
(7, 'active', '2026-03-05 00:00:00', NULL),
(15, 'active', '2026-03-20 00:00:00', NULL),
(23, 'active', NULL, NULL),
(24, 'active', '2026-03-23 11:30:00', '2026-03-27 13:30:00');

--
-- Indexek a kiírt táblákhoz
--

--
-- A tábla indexei `attachments`
--
ALTER TABLE `attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `entry_id` (`entry_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT a táblához `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT a táblához `entries`
--
ALTER TABLE `entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT a táblához `exceptions`
--
ALTER TABLE `exceptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT a táblához `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
-- AUTO_INCREMENT a táblához `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
-- Megkötések a táblához `todo_details`
--
ALTER TABLE `todo_details`
  ADD CONSTRAINT `todo_details_ibfk_1` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
