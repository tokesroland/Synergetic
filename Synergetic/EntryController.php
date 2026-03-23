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
        $stmt = $this->pdo->prepare("SELECT id, type, title, pos_x AS x, pos_y AS y FROM entries WHERE group_id = ?");
        $stmt->execute([$groupId]);
        $entries = $stmt->fetchAll();

        foreach ($entries as &$entry) {
            $entry['x'] = (float)$entry['x'];
            $entry['y'] = (float)$entry['y'];
            $entry['links'] = []; 
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
                "entry_id" => $entry_id
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
}