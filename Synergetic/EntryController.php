<?php
// EntryController.php
require_once 'config.php';

class EntryController {
    private $pdo;

    public function __construct() {
        global $host, $dbname, $username, $password;
        try {
            // Közvetlen kapcsolódás a kontrolleren belül
            $this->pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(["error" => "Adatbázis hiba: " . $e->getMessage()]));
        }
    }

// Csoport elemeinek lekérése a gráfhoz
    public function getAllByGroup($groupId) {
        // Hozzáadtuk a category_id lekérését is a menühöz!
        $stmt = $this->pdo->prepare("SELECT id, type, title, category_id, pos_x AS x, pos_y AS y FROM entries WHERE group_id = ?");
        $stmt->execute([$groupId]);
        $entries = $stmt->fetchAll();

        // 1. Kigyűjtjük az id-kat, hogy le tudjuk kérni hozzájuk a kapcsolatokat
        $entryIds = array_column($entries, 'id');
        $linksMapping = [];
        
        if (!empty($entryIds)) {
            $inQuery = implode(',', array_fill(0, count($entryIds), '?'));
            // Lekérjük az összes olyan linket, aminek a forrása vagy célja ebben a csoportban van
            $stmtLinks = $this->pdo->prepare("SELECT source_id, target_id FROM entry_links WHERE source_id IN ($inQuery) OR target_id IN ($inQuery)");
            $stmtLinks->execute(array_merge($entryIds, $entryIds));
            $allLinks = $stmtLinks->fetchAll();

            // Mivel a gráf irányítatlan, mindkét oldalra felvesszük a kapcsolatot
            foreach ($allLinks as $link) {
                $linksMapping[$link['source_id']][] = $link['target_id'];
                $linksMapping[$link['target_id']][] = $link['source_id'];
            }
        }

        // 2. Összefűzzük az adatokat
        foreach ($entries as &$entry) {
            $entry['x'] = (float)$entry['x'];
            $entry['y'] = (float)$entry['y'];
            
            // Ha van kapcsolat, beletesszük (array_values(array_unique(...)) a duplikációk elkerülésére)
            if (isset($linksMapping[$entry['id']])) {
                $entry['links'] = array_values(array_unique($linksMapping[$entry['id']]));
            } else {
                $entry['links'] = [];
            }
        }
        
        return ["entries" => $entries];
    }

    // Egy konkrét bejegyzés lekérése a részletes nézethez
    public function getOne($id) {
        $stmt = $this->pdo->prepare("SELECT id, title, content, type FROM entries WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    // Új elem létrehozása
    public function create($data) {
        $title = $data['title'] ?? '';
        $group_id = $data['group_id'] ?? 1;
        $category_id = !empty($data['category_id']) ? $data['category_id'] : null;
        $type = $data['type'] ?? 'note';
        $pos_x = $data['pos_x'] ?? rand(100, 700);
        $pos_y = $data['pos_y'] ?? rand(100, 500);

        if (empty($title)) throw new Exception("A cím kötelező!");

        try {
            $this->pdo->beginTransaction();
            
            $stmt = $this->pdo->prepare("INSERT INTO entries (group_id, category_id, type, title, pos_x, pos_y) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$group_id, $category_id, $type, $title, $pos_x, $pos_y]);
            $entry_id = $this->pdo->lastInsertId();

            if ($type === 'event') {
                $this->saveEventDetails($entry_id, $data);
            } elseif ($type === 'todo') {
                $this->saveTodoDetails($entry_id, $data);
            }

            $this->pdo->commit();
            return [
                "message" => "Elem sikeresen létrehozva!",
                "id" => $entry_id
            ];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // Bejegyzés frissítése (Cím és Tartalom)
    public function update($data) {
        if (!isset($data['id'])) throw new Exception("Hiányzó azonosító!");
        
        $stmt = $this->pdo->prepare("UPDATE entries SET title = ?, content = ? WHERE id = ?");
        $stmt->execute([$data['title'], $data['content'], $data['id']]);
        return ["message" => "Sikeres mentés!"];
    }

    private function saveEventDetails($id, $data) {
        $start = !empty($data['start_datetime']) ? $data['start_datetime'] : date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare("INSERT INTO event_details (entry_id, start_datetime, end_datetime, is_all_day) VALUES (?, ?, ?, ?)");
        $stmt->execute([$id, $start, $data['end_datetime'] ?? null, $data['is_all_day'] ?? 0]);
    }

    private function saveTodoDetails($id, $data) {
        $start = !empty($data['start_datetime']) ? $data['start_datetime'] : null;
        $stmt = $this->pdo->prepare("INSERT INTO todo_details (entry_id, status, start_datetime, end_datetime) VALUES (?, 'active', ?, ?)");
        $stmt->execute([$id, $start, $data['end_datetime'] ?? null]);
    }
    // --- ÚJ: Csoportok és statisztikáik lekérése ---
    public function getGroups() {
        $sql = "
            SELECT 
                g.id, 
                g.name, 
                g.color_hex,
                SUM(CASE WHEN e.type = 'todo' THEN 1 ELSE 0 END) AS todo_count,
                SUM(CASE WHEN e.type = 'event' THEN 1 ELSE 0 END) AS event_count,
                SUM(CASE WHEN e.type = 'note' THEN 1 ELSE 0 END) AS note_count
            FROM groups g
            LEFT JOIN entries e ON g.id = e.group_id
            GROUP BY g.id
            ORDER BY g.name ASC
        ";
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll();
    }

    // --- ÚJ: Naptár bejegyzések lekérése ---
    public function getCalendarEntries() {
        // Összefésüljük a todo és event adatokat, hogy a naptár nézetben mindkettő megjeleníthető legyen
        $sql = "
            SELECT 
                e.id, 
                e.title, 
                e.content, 
                e.type,
                COALESCE(ed.start_datetime, td.start_datetime) AS start_datetime,
                COALESCE(ed.end_datetime, td.end_datetime) AS end_datetime,
                ed.is_all_day
            FROM entries e
            LEFT JOIN event_details ed ON e.id = ed.entry_id AND e.type = 'event'
            LEFT JOIN todo_details td ON e.id = td.entry_id AND e.type = 'todo'
            WHERE e.type IN ('todo', 'event') 
            AND (ed.start_datetime IS NOT NULL OR td.start_datetime IS NOT NULL)
        ";
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll();
    }

    // --- ÚJ: Kategória létrehozása ---
    public function createCategory($data) {
        if (empty($data['name'])) throw new Exception("A kategória neve kötelező!");
        $stmt = $this->pdo->prepare("INSERT INTO categories (name, color_hex) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['color_hex'] ?? '#5c6bc0']);
        return ["message" => "Kategória sikeresen létrehozva!", "id" => $this->pdo->lastInsertId()];
    }

    // --- ÚJ: Tag (Címke) létrehozása ---
    public function createTag($data) {
        if (empty($data['name'])) throw new Exception("A címke neve kötelező!");
        $stmt = $this->pdo->prepare("INSERT INTO tags (name, color_hex) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['color_hex'] ?? '#ff9800']);
        return ["message" => "Címke sikeresen létrehozva!", "id" => $this->pdo->lastInsertId()];
    }

    // --- ÚJ: Helyszín létrehozása ---
    public function createLocation($data) {
        if (empty($data['name'])) throw new Exception("A helyszín neve kötelező!");
        $stmt = $this->pdo->prepare("INSERT INTO locations (name) VALUES (?)");
        $stmt->execute([$data['name']]);
        return ["message" => "Helyszín sikeresen létrehozva!", "id" => $this->pdo->lastInsertId()];
    }
    // --- ÚJ: Új kapcsolat (Link) mentése ---
    public function createLink($sourceId, $targetId) {
        if (empty($sourceId) || empty($targetId) || $sourceId == $targetId) {
            throw new Exception("Érvénytelen kapcsolat azonosítók.");
        }
        // Megnézzük, létezik-e már ez a kapcsolat (bármelyik irányban)
        $checkStmt = $this->pdo->prepare("SELECT 1 FROM entry_links WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)");
        $checkStmt->execute([$sourceId, $targetId, $targetId, $sourceId]);
        if ($checkStmt->fetch()) {
            return ["message" => "Ez a kapcsolat már létezik."]; // Nem dobunk hibát, csak nem csinálunk semmit
        }

        $stmt = $this->pdo->prepare("INSERT INTO entry_links (source_id, target_id) VALUES (?, ?)");
        $stmt->execute([$sourceId, $targetId]);
        return ["message" => "Kapcsolat sikeresen létrehozva!"];
    }

    // --- ÚJ: Kapcsolat (Link) törlése ---
    public function deleteLink($sourceId, $targetId) {
        if (empty($sourceId) || empty($targetId)) throw new Exception("Hiányzó azonosítók a törléshez.");
        // Mivel a gráf irányítatlan vizuálisan, mindkét eshetőséget töröljük a biztonság kedvéért
        $stmt = $this->pdo->prepare("DELETE FROM entry_links WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)");
        $stmt->execute([$sourceId, $targetId, $targetId, $sourceId]);
        return ["message" => "Kapcsolat sikeresen bontva!"];
    }

    // --- ÚJ: Bejegyzés (Entry) törlése ---
    public function deleteEntry($id) {
        if (empty($id)) throw new Exception("Hiányzó azonosító.");
        // A Foreign Key (ON DELETE CASCADE) beállítások miatt, ha töröljük a fő entry-t, 
        // automatikusan törlődnek a hozzá tartozó todo_details, event_details, tags, és LINKS is!
        $stmt = $this->pdo->prepare("DELETE FROM entries WHERE id = ?");
        $stmt->execute([$id]);
        return ["message" => "Bejegyzés sikeresen törölve!"];
    }

    // --- POZÍCIÓ MENTÉSE ---
    public function updatePosition($id, $x, $y) {
        $stmt = $this->pdo->prepare("UPDATE entries SET pos_x = ?, pos_y = ? WHERE id = ?");
        $stmt->execute([$x, $y, $id]);
        return ["message" => "Pozíció mentve!"];
    }

    // --- KATEGÓRIÁK ÉS TAGEK LEKÉRÉSE ---
    public function getCategories() {
        return $this->pdo->query("SELECT * FROM categories ORDER BY name ASC")->fetchAll();
    }

    public function getTags() {
        return $this->pdo->query("SELECT * FROM tags ORDER BY name ASC")->fetchAll();
    }

    // --- HOZZÁRENDELÉSEK (ASSIGN) ---
    public function assignCategory($entryId, $categoryId) {
        $stmt = $this->pdo->prepare("UPDATE entries SET category_id = ? WHERE id = ?");
        $stmt->execute([$categoryId, $entryId]);
        return ["message" => "Kategória sikeresen hozzárendelve!"];
    }

    public function assignTag($entryId, $tagId) {
        // IGNORE: Ha már hozzá van rendelve, nem dob hibát, csak átugorja
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)");
        $stmt->execute([$entryId, $tagId]);
        return ["message" => "Címke sikeresen hozzárendelve!"];
    }
}