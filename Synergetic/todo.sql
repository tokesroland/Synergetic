-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1
-- Létrehozás ideje: 2026. Máj 23. 10:11
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

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `entry_links`
--

CREATE TABLE `entry_links` (
  `source_id` int(11) NOT NULL,
  `target_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `entry_tags`
--

CREATE TABLE `entry_tags` (
  `entry_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(1, 'Csoportosítatlan', 'Alapértelmezett csoport bejegyzéseknek', '#888888', '2026-03-05 10:25:23');

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
-- Tábla szerkezet ehhez a táblához `routine_completions`
--

CREATE TABLE `routine_completions` (
  `id` int(11) NOT NULL,
  `routine_item_id` int(11) NOT NULL,
  `completed_date` date NOT NULL,
  `completed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `routine_exceptions`
--

CREATE TABLE `routine_exceptions` (
  `id` int(11) NOT NULL,
  `routine_item_id` int(11) NOT NULL,
  `created_on` date NOT NULL COMMENT 'Ettől a naptól számoljuk a következő N előfordulást',
  `occurrences` int(11) NOT NULL DEFAULT 1 COMMENT 'Hány alkalomra szól (N)',
  `remaining` int(11) NOT NULL DEFAULT 1 COMMENT 'Hátralévő alkalmak száma',
  `is_skip` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = az alkalmak elmaradnak (lemondás)',
  `new_day_of_week` tinyint(1) DEFAULT NULL COMMENT 'Másik nap (1-7), NULL = eredeti nap marad',
  `new_start_time` time DEFAULT NULL COMMENT 'Módosított kezdés, NULL = eredeti',
  `new_end_time` time DEFAULT NULL COMMENT 'Módosított vég, NULL = eredeti',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = aktív, 0 = lejárt/deaktivált (audit)',
  `valid_until` date DEFAULT NULL COMMENT 'Opcionális biztonsági lejárati dátum',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `color_hex` varchar(7) DEFAULT '#888888'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(190) NOT NULL,
  `username` varchar(60) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
-- A tábla indexei `routine_completions`
--
ALTER TABLE `routine_completions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_item_date` (`routine_item_id`,`completed_date`);

--
-- A tábla indexei `routine_exceptions`
--
ALTER TABLE `routine_exceptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_routine_item` (`routine_item_id`),
  ADD KEY `idx_active` (`is_active`);

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
-- A tábla indexei `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_users_email` (`email`),
  ADD UNIQUE KEY `uniq_users_username` (`username`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT a táblához `entries`
--
ALTER TABLE `entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT a táblához `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;

--
-- AUTO_INCREMENT a táblához `locations`
--
ALTER TABLE `locations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT a táblához `routine_completions`
--
ALTER TABLE `routine_completions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT a táblához `routine_exceptions`
--
ALTER TABLE `routine_exceptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT a táblához `routine_items`
--
ALTER TABLE `routine_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT a táblához `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT a táblához `users`
--
ALTER TABLE `users`
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
-- Megkötések a táblához `routine_completions`
--
ALTER TABLE `routine_completions`
  ADD CONSTRAINT `fk_completion_item` FOREIGN KEY (`routine_item_id`) REFERENCES `routine_items` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `routine_exceptions`
--
ALTER TABLE `routine_exceptions`
  ADD CONSTRAINT `fk_rex_routine_item` FOREIGN KEY (`routine_item_id`) REFERENCES `routine_items` (`id`) ON DELETE CASCADE;

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
