<?php
// EntryController.php
require_once 'config.php';

class EntryController {
    private $pdo;

    // Engedélyezett MIME típusok csatolmányokhoz (futtatható fájlok KIZÁRVA)
    private const ALLOWED_MIME_TYPES = [
        // Képek
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Videók
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
        // Szöveg / Dokumentum
        'text/plain', 'text/csv', 'text/markdown',
        'application/pdf',
        // Audio (olvasható, nem futtatható)
        'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
    ];

    // Feltöltési könyvtár
    private const UPLOAD_DIR = 'uploads/attachments/';

    public function __construct() {
        global $host, $dbname, $username, $password;
        try {
            $this->pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(["error" => "Adatbázis hiba: " . $e->getMessage()]));
        }
    }

    // ─── Csoportok ──────────────────────────────────────────────────────────
    public function getGroups() {
        $sql = "
            SELECT 
                g.id, g.name, g.description, g.color_hex,
                SUM(CASE WHEN e.type = 'todo'  THEN 1 ELSE 0 END) AS todo_count,
                SUM(CASE WHEN e.type = 'event' THEN 1 ELSE 0 END) AS event_count,
                SUM(CASE WHEN e.type = 'note'  THEN 1 ELSE 0 END) AS note_count
            FROM groups g
            LEFT JOIN entries e ON g.id = e.group_id
            GROUP BY g.id
            ORDER BY g.name ASC
        ";
        return $this->pdo->query($sql)->fetchAll();
    }

    // ─── Csoport összes eleme (gráf) ────────────────────────────────────────
    public function getAllByGroup($groupId) {
        // formázás szükséges
        $stmt = $this->pdo->prepare(
            "SELECT e.id, e.type, e.title, e.category_id, e.pos_x AS x, e.pos_y AS y, td.planned_start AS todo_planned_start, td.deadline AS todo_deadline, ed.start_datetime AS event_start_datetime, ed.end_datetime AS event_end_datetime FROM entries e LEFT JOIN todo_details td ON e.id = td.entry_id AND e.type = 'todo' LEFT JOIN event_details ed ON e.id = ed.entry_id AND e.type = 'event' WHERE e.group_id = ?"
        );
        $stmt->execute([$groupId]);
        $entries = $stmt->fetchAll();

        $entryIds = array_column($entries, 'id');
        $linksMapping = [];

        if (!empty($entryIds)) {
            $inQuery = implode(',', array_fill(0, count($entryIds), '?'));
            $stmtLinks = $this->pdo->prepare(
                "SELECT source_id, target_id FROM entry_links
                 WHERE source_id IN ($inQuery) OR target_id IN ($inQuery)"
            );
            $stmtLinks->execute(array_merge($entryIds, $entryIds));
            foreach ($stmtLinks->fetchAll() as $link) {
                $linksMapping[$link['source_id']][] = $link['target_id'];
                $linksMapping[$link['target_id']][] = $link['source_id'];
            }
        }

        foreach ($entries as &$entry) {
            $entry['x'] = (float)$entry['x'];
            $entry['y'] = (float)$entry['y'];

            if ($entry['type'] === 'todo') {
                $entry['deadline'] = $entry['todo_deadline'] ?? null;
                $entry['planned_start'] = $entry['todo_planned_start'] ?? null;
            } elseif ($entry['type'] === 'event') {
                $entry['start_datetime'] = $entry['event_start_datetime'] ?? null;
                $entry['end_datetime'] = $entry['event_end_datetime'] ?? null;
            }

            $entry['links'] = isset($linksMapping[$entry['id']])
                ? array_values(array_unique($linksMapping[$entry['id']]))
                : [];
        }

        return ["entries" => $entries];
    }

    // ─── Egy elem részletes lekérése ────────────────────────────────────────
    public function getOne($id) {
        $stmt = $this->pdo->prepare("
            SELECT e.id, e.title, e.content, e.type, e.category_id, e.group_id,
                c.name      AS category_name,
                c.color_hex AS category_color,
                g.name      AS group_name
            FROM entries e
            LEFT JOIN categories c ON e.category_id = c.id
            LEFT JOIN groups     g ON e.group_id     = g.id
            WHERE e.id = ?
        ");
        $stmt->execute([$id]);
        $entry = $stmt->fetch();
        if (!$entry) return null;

        // Tagek
        $tagStmt = $this->pdo->prepare("
            SELECT t.id, t.name, t.color_hex
            FROM tags t JOIN entry_tags et ON t.id = et.tag_id
            WHERE et.entry_id = ?
        ");
        $tagStmt->execute([$id]);
        $entry['tags'] = $tagStmt->fetchAll();

        // Csatolmányok
        $attStmt = $this->pdo->prepare("
            SELECT id, file_path, file_type, original_name, uploaded_at
            FROM attachments WHERE entry_id = ? ORDER BY uploaded_at ASC
        ");
        $attStmt->execute([$id]);
        $entry['attachments'] = $attStmt->fetchAll();

        // Type-specifikus részletek
        if ($entry['type'] === 'todo') {
            $detailStmt = $this->pdo->prepare(
                "SELECT status, planned_start, deadline FROM todo_details WHERE entry_id = ?"
            );
            $detailStmt->execute([$id]);
            $entry['todo_details'] = $detailStmt->fetch() ?: null;
        } elseif ($entry['type'] === 'event') {
            $detailStmt = $this->pdo->prepare("
                SELECT ed.start_datetime, ed.end_datetime, ed.is_all_day,
                    l.id AS location_id, l.name AS location_name
                FROM event_details ed
                LEFT JOIN locations l ON ed.location_id = l.id
                WHERE ed.entry_id = ?
            ");
            $detailStmt->execute([$id]);
            $entry['event_details'] = $detailStmt->fetch() ?: null;
        }
        return $entry;
    }
    
    // ─── Új elem létrehozása ────────────────────────────────────────────────
    public function create($data) {
        $title       = $data['title']       ?? '';
        $group_id    = $data['group_id']    ?? 1;
        $category_id = !empty($data['category_id']) ? $data['category_id'] : null;
        $type        = $data['type']        ?? 'note';
        $pos_x       = $data['pos_x']       ?? rand(100, 700);
        $pos_y       = $data['pos_y']       ?? rand(100, 500);

        if (empty($title)) throw new Exception("A cím kötelező!");

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare(
                "INSERT INTO entries (group_id, category_id, type, title, pos_x, pos_y) VALUES (?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([$group_id, $category_id, $type, $title, $pos_x, $pos_y]);
            $entry_id = $this->pdo->lastInsertId();

            if ($type === 'event')     $this->saveEventDetails($entry_id, $data);
            elseif ($type === 'todo')  $this->saveTodoDetails($entry_id, $data);

            $this->pdo->commit();
            return ["message" => "Elem sikeresen létrehozva!", "id" => $entry_id];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // ─── Elem frissítése ────────────────────────────────────────────────────
// EntryController.php
    public function update($data) {
        if (!isset($data['id'])) throw new Exception("Hiányzó azonosító!");
        
        $title = $data['title'] ?? '';
        $content = $data['content'] ?? '';
        $stmt = $this->pdo->prepare("UPDATE entries SET title = ?, content = ? WHERE id = ?");
        $stmt->execute([$title, $content, $data['id']]);
        
        return ["message" => "Sikeres mentés!", "debug_received_content" => $content]; 
    }

    // ─── Pozíció mentése ────────────────────────────────────────────────────
    public function updatePosition($id, $x, $y) {
        $stmt = $this->pdo->prepare("UPDATE entries SET pos_x = ?, pos_y = ? WHERE id = ?");
        $stmt->execute([$x, $y, $id]);
        return ["message" => "Pozíció mentve!"];
    }

    // ─── Elem törlése ───────────────────────────────────────────────────────
    public function deleteEntry($id) {
        if (empty($id)) throw new Exception("Hiányzó azonosító.");

        // Csatolmányok törlése fájlrendszerről is
        $attStmt = $this->pdo->prepare("SELECT file_path FROM attachments WHERE entry_id = ?");
        $attStmt->execute([$id]);
        foreach ($attStmt->fetchAll() as $att) {
            if (file_exists($att['file_path'])) @unlink($att['file_path']);
        }

        $stmt = $this->pdo->prepare("DELETE FROM entries WHERE id = ?");
        $stmt->execute([$id]);
        return ["message" => "Bejegyzés sikeresen törölve!"];
    }

    // ─── Kapcsolatok ────────────────────────────────────────────────────────
    public function createLink($sourceId, $targetId) {
        if (empty($sourceId) || empty($targetId) || $sourceId == $targetId)
            throw new Exception("Érvénytelen kapcsolat azonosítók.");

        $check = $this->pdo->prepare(
            "SELECT 1 FROM entry_links WHERE (source_id=? AND target_id=?) OR (source_id=? AND target_id=?)"
        );
        $check->execute([$sourceId, $targetId, $targetId, $sourceId]);
        if ($check->fetch()) return ["message" => "Ez a kapcsolat már létezik."];

        $stmt = $this->pdo->prepare("INSERT INTO entry_links (source_id, target_id) VALUES (?, ?)");
        $stmt->execute([$sourceId, $targetId]);
        return ["message" => "Kapcsolat sikeresen létrehozva!"];
    }

    public function deleteLink($sourceId, $targetId) {
        if (empty($sourceId) || empty($targetId)) throw new Exception("Hiányzó azonosítók.");
        $stmt = $this->pdo->prepare(
            "DELETE FROM entry_links WHERE (source_id=? AND target_id=?) OR (source_id=? AND target_id=?)"
        );
        $stmt->execute([$sourceId, $targetId, $targetId, $sourceId]);
        return ["message" => "Kapcsolat sikeresen bontva!"];
    }

    // ─── Kategóriák ─────────────────────────────────────────────────────────
    public function getCategories() {
        return $this->pdo->query("SELECT * FROM categories ORDER BY name ASC")->fetchAll();
    }

    public function createCategory($data) {
        if (empty($data['name'])) throw new Exception("A kategória neve kötelező!");
        $stmt = $this->pdo->prepare("INSERT INTO categories (name, color_hex) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['color_hex'] ?? '#5c6bc0']);
        return ["message" => "Kategória létrehozva!", "id" => $this->pdo->lastInsertId()];
    }

    public function assignCategory($entryId, $categoryId) {
        $stmt = $this->pdo->prepare("UPDATE entries SET category_id = ? WHERE id = ?");
        $stmt->execute([$categoryId, $entryId]);
        return ["message" => "Kategória hozzárendelve!"];
    }

    // ─── Tagek ──────────────────────────────────────────────────────────────
    public function getTags() {
        return $this->pdo->query("SELECT * FROM tags ORDER BY name ASC")->fetchAll();
    }

    public function createTag($data) {
        if (empty($data['name'])) throw new Exception("A tag neve kötelező!");
        $stmt = $this->pdo->prepare("INSERT INTO tags (name, color_hex) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['color_hex'] ?? '#ff9800']);
        return ["message" => "Tag létrehozva!", "id" => $this->pdo->lastInsertId()];
    }

    public function assignTag($entryId, $tagId) {
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)");
        $stmt->execute([$entryId, $tagId]);
        return ["message" => "Tag hozzárendelve!"];
    }

    // ─── ÚJ: Tag eltávolítása ───────────────────────────────────────────────
    public function unassignTag($entryId, $tagId) {
        if (empty($entryId) || empty($tagId)) throw new Exception("Hiányzó azonosítók.");
        $stmt = $this->pdo->prepare("DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?");
        $stmt->execute([$entryId, $tagId]);
        return ["message" => "Tag eltávolítva!"];
    }

    // ─── Helyszín ───────────────────────────────────────────────────────────
    public function createLocation($data) {
        if (empty($data['name'])) throw new Exception("A helyszín neve kötelező!");
        $stmt = $this->pdo->prepare("INSERT INTO locations (name) VALUES (?)");
        $stmt->execute([$data['name']]);
        return ["message" => "Helyszín létrehozva!", "id" => $this->pdo->lastInsertId()];
    }

    public function getLocations() {
        return $this->pdo->query("SELECT * FROM locations ORDER BY name ASC")->fetchAll();
    }

    // ─── ÚJ: Csatolmány feltöltése ──────────────────────────────────────────
    public function uploadAttachment($entryId, $file) {
        if (empty($entryId)) throw new Exception("Hiányzó entry azonosító.");

        // Entry létezik-e?
        $check = $this->pdo->prepare("SELECT id FROM entries WHERE id = ?");
        $check->execute([$entryId]);
        if (!$check->fetch()) throw new Exception("A bejegyzés nem létezik.");

        // MIME ellenőrzés — finfo a legmegbízhatóbb módszer
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo->file($file['tmp_name']);

        if (!in_array($detectedMime, self::ALLOWED_MIME_TYPES)) {
            throw new Exception("Nem engedélyezett fájltípus: $detectedMime");
        }

        // Könyvtár létrehozása ha még nincs
        $uploadDir = self::UPLOAD_DIR . $entryId . '/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                throw new Exception("Nem sikerült a feltöltési könyvtárat létrehozni.");
            }
        }

        // Biztonságos fájlnév: csak UUID alapú, az eredeti neve külön tárolva
        $extension  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $safeName   = bin2hex(random_bytes(16)) . '.' . $extension;
        $targetPath = $uploadDir . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            throw new Exception("A fájl áthelyezése sikertelen.");
        }

        // Adatbázisba mentés
        $stmt = $this->pdo->prepare(
            "INSERT INTO attachments (entry_id, file_path, file_type, original_name) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([$entryId, $targetPath, $detectedMime, $file['name']]);
        $attachmentId = $this->pdo->lastInsertId();

        return [
            "message"       => "Csatolmány feltöltve!",
            "id"            => $attachmentId,
            "file_path"     => $targetPath,
            "file_type"     => $detectedMime,
            "original_name" => $file['name']
        ];
    }

    // ─── ÚJ: Csatolmány törlése ─────────────────────────────────────────────
    public function deleteAttachment($attachmentId) {
        if (empty($attachmentId)) throw new Exception("Hiányzó csatolmány azonosító.");

        $stmt = $this->pdo->prepare("SELECT file_path FROM attachments WHERE id = ?");
        $stmt->execute([$attachmentId]);
        $att = $stmt->fetch();

        if (!$att) throw new Exception("A csatolmány nem található.");

        // Fájlrendszerről törlés
        if (file_exists($att['file_path'])) {
            @unlink($att['file_path']);
        }

        $del = $this->pdo->prepare("DELETE FROM attachments WHERE id = ?");
        $del->execute([$attachmentId]);

        return ["message" => "Csatolmány törölve!"];
    }

    // ─── Naptár ─────────────────────────────────────────────────────────────
    public function getCalendarEntries() {
        $sql = "
            SELECT 
                e.id, e.title, e.content, e.type,
                COALESCE(ed.start_datetime, td.planned_start) AS start_datetime,
                COALESCE(ed.end_datetime,   td.deadline)      AS end_datetime,
                ed.is_all_day
            FROM entries e
            LEFT JOIN event_details ed ON e.id = ed.entry_id AND e.type = 'event'
            LEFT JOIN todo_details  td ON e.id = td.entry_id AND e.type = 'todo'
            WHERE e.type IN ('todo', 'event')
            AND (ed.start_datetime IS NOT NULL OR td.planned_start IS NOT NULL)
        ";
        return $this->pdo->query($sql)->fetchAll();
    }
    // ─── Privát segédfüggvények ──────────────────────────────────────────────

    // datetime-local input értéke "2025-03-28T14:30" - MySQL-hez "2025-03-28 14:30:00" kell
    private function normalizeDateTime(?string $val): ?string {
        if (empty($val)) return null;
        // T elválasztó cseréje szóközre, másodperc hozzáadása ha hiányzik
        $val = str_replace('T', ' ', $val);
        if (strlen($val) === 16) $val .= ':00'; // "2025-03-28 14:30" -> "2025-03-28 14:30:00"
        return $val;
    }

    private function saveEventDetails($id, $data) {
        $start       = $this->normalizeDateTime($data['start_datetime'] ?? null) ?? date('Y-m-d H:i:s');
        $end         = $this->normalizeDateTime($data['end_datetime'] ?? null);
        $is_all_day  = isset($data['is_all_day']) ? (int)$data['is_all_day'] : 0;
        $location_id = !empty($data['location_id']) ? (int)$data['location_id'] : null;

        $stmt = $this->pdo->prepare(
            "INSERT INTO event_details (entry_id, start_datetime, end_datetime, is_all_day, location_id)
            VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$id, $start, $end, $is_all_day, $location_id]);
    }

    private function saveTodoDetails($id, $data) {
        $planned_start = $this->normalizeDateTime($data['planned_start'] ?? null);
        $deadline      = $this->normalizeDateTime($data['deadline'] ?? null);
        $stmt = $this->pdo->prepare(
            "INSERT INTO todo_details (entry_id, status, planned_start, deadline)
            VALUES (?, 'active', ?, ?)"
        );
        $stmt->execute([$id, $planned_start, $deadline]);
    }
}
