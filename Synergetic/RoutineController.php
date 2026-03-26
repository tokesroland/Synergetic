<?php
// RoutineController.php
require_once 'config.php';

class RoutineController {
    private $pdo;

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

    // ===== ÖSSZES RUTIN ELEM LEKÉRÉSE (hét összes napja) =====
    public function getAll() {
        $sql = "
            SELECT 
                ri.id,
                ri.title,
                ri.type,
                ri.category_id,
                ri.day_of_week,
                ri.start_time,
                ri.end_time,
                ri.color_hex,
                c.name AS category_name,
                c.color_hex AS category_color
            FROM routine_items ri
            LEFT JOIN categories c ON ri.category_id = c.id
            ORDER BY ri.day_of_week ASC, ri.start_time ASC
        ";
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll();
    }

    // ===== EGY NAP RUTIN ELEMEINEK LEKÉRÉSE =====
    public function getByDay($dayOfWeek) {
        $sql = "
            SELECT 
                ri.id,
                ri.title,
                ri.type,
                ri.category_id,
                ri.day_of_week,
                ri.start_time,
                ri.end_time,
                ri.color_hex,
                c.name AS category_name,
                c.color_hex AS category_color
            FROM routine_items ri
            LEFT JOIN categories c ON ri.category_id = c.id
            WHERE ri.day_of_week = ?
            ORDER BY ri.start_time ASC
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dayOfWeek]);
        return $stmt->fetchAll();
    }

    // ===== EGY RUTIN ELEM LEKÉRÉSE =====
    public function getOne($id) {
        $stmt = $this->pdo->prepare("
            SELECT ri.*, c.name AS category_name, c.color_hex AS category_color
            FROM routine_items ri
            LEFT JOIN categories c ON ri.category_id = c.id
            WHERE ri.id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    // ===== ÚJ RUTIN ELEM LÉTREHOZÁSA =====
    public function create($data) {
        $title = $data['title'] ?? '';
        $type = $data['type'] ?? 'todo';
        $categoryId = !empty($data['category_id']) ? $data['category_id'] : null;
        $dayOfWeek = $data['day_of_week'] ?? 1;
        $startTime = $data['start_time'] ?? '08:00';
        $endTime = $data['end_time'] ?? '09:00';
        $colorHex = $data['color_hex'] ?? null;

        if (empty($title)) {
            throw new Exception("A cím kötelező!");
        }
        if ($dayOfWeek < 1 || $dayOfWeek > 7) {
            throw new Exception("Érvénytelen nap (1-7)!");
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO routine_items (title, type, category_id, day_of_week, start_time, end_time, color_hex)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$title, $type, $categoryId, $dayOfWeek, $startTime, $endTime, $colorHex]);

        return [
            "message" => "Rutin elem sikeresen létrehozva!",
            "id" => (int)$this->pdo->lastInsertId()
        ];
    }

    // ===== RUTIN ELEM FRISSÍTÉSE =====
    public function update($data) {
        if (!isset($data['id'])) {
            throw new Exception("Hiányzó azonosító!");
        }

        $fields = [];
        $values = [];

        if (isset($data['title'])) { $fields[] = "title = ?"; $values[] = $data['title']; }
        if (isset($data['type'])) { $fields[] = "type = ?"; $values[] = $data['type']; }
        if (array_key_exists('category_id', $data)) { $fields[] = "category_id = ?"; $values[] = $data['category_id'] ?: null; }
        if (isset($data['day_of_week'])) { $fields[] = "day_of_week = ?"; $values[] = $data['day_of_week']; }
        if (isset($data['start_time'])) { $fields[] = "start_time = ?"; $values[] = $data['start_time']; }
        if (isset($data['end_time'])) { $fields[] = "end_time = ?"; $values[] = $data['end_time']; }
        if (array_key_exists('color_hex', $data)) { $fields[] = "color_hex = ?"; $values[] = $data['color_hex']; }

        if (empty($fields)) {
            throw new Exception("Nincs frissítendő mező!");
        }

        $values[] = $data['id'];
        $sql = "UPDATE routine_items SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);

        return ["message" => "Rutin elem sikeresen frissítve!"];
    }

    // ===== RUTIN ELEM TÖRLÉSE =====
    public function delete($id) {
        if (empty($id)) {
            throw new Exception("Hiányzó azonosító!");
        }
        $stmt = $this->pdo->prepare("DELETE FROM routine_items WHERE id = ?");
        $stmt->execute([$id]);
        return ["message" => "Rutin elem sikeresen törölve!"];
    }

    // ===== TELJESÍTÉS PIPÁLÁSA (TOGGLE) =====
    public function toggleCompletion($routineItemId, $date) {
        if (empty($routineItemId) || empty($date)) {
            throw new Exception("Hiányzó azonosító vagy dátum!");
        }

        // Ellenőrizzük, hogy létezik-e már
        $checkStmt = $this->pdo->prepare("
            SELECT id FROM routine_completions 
            WHERE routine_item_id = ? AND completed_date = ?
        ");
        $checkStmt->execute([$routineItemId, $date]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            // Már létezik → töröljük (toggle OFF)
            $this->pdo->prepare("DELETE FROM routine_completions WHERE id = ?")->execute([$existing['id']]);
            return ["message" => "Teljesítés visszavonva!", "completed" => false];
        } else {
            // Nem létezik → létrehozzuk (toggle ON)
            $this->pdo->prepare("
                INSERT INTO routine_completions (routine_item_id, completed_date) VALUES (?, ?)
            ")->execute([$routineItemId, $date]);
            return ["message" => "Teljesítve!", "completed" => true];
        }
    }

    // ===== TELJESÍTÉSEK LEKÉRÉSE EGY ADOTT DÁTUMRA =====
    public function getCompletions($date) {
        $stmt = $this->pdo->prepare("
            SELECT routine_item_id FROM routine_completions WHERE completed_date = ?
        ");
        $stmt->execute([$date]);
        return array_column($stmt->fetchAll(), 'routine_item_id');
    }

    // ===== HETI ÖSSZEGZÉS (Statisztikákhoz később) =====
    public function getWeekSummary($weekStartDate) {
        $weekEnd = date('Y-m-d', strtotime($weekStartDate . ' +6 days'));
        
        // Összes rutin elem száma napokra bontva
        $totalStmt = $this->pdo->query("
            SELECT day_of_week, COUNT(*) as total FROM routine_items GROUP BY day_of_week
        ");
        $totals = [];
        foreach ($totalStmt->fetchAll() as $row) {
            $totals[$row['day_of_week']] = (int)$row['total'];
        }

        // Teljesített elemek
        $completedStmt = $this->pdo->prepare("
            SELECT rc.completed_date, COUNT(*) as done
            FROM routine_completions rc
            WHERE rc.completed_date BETWEEN ? AND ?
            GROUP BY rc.completed_date
        ");
        $completedStmt->execute([$weekStartDate, $weekEnd]);
        $completions = [];
        foreach ($completedStmt->fetchAll() as $row) {
            $completions[$row['completed_date']] = (int)$row['done'];
        }

        return [
            "totals_by_day" => $totals,
            "completions_by_date" => $completions
        ];
    }
}
