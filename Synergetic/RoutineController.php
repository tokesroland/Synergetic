<?php
// RoutineController.php v2 – routine_exceptions (ideiglenes kivételek) támogatással
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

    /* =================================================================
     *  SEGÉD: az adott naptári dátumhoz tartozó day_of_week (1=Hé .. 7=Va)
     * ================================================================= */
    private function dowForDate($dateStr) {
        // PHP date('N'): 1 (hétfő) .. 7 (vasárnap) – pont a mi sémánk
        return (int)date('N', strtotime($dateStr));
    }

    /* =================================================================
     *  SEGÉD: egy rutinra az adott dátumon érvényes AKTÍV kivétel
     *
     *  Logika ("következő N előfordulás"):
     *   - A kivétel a created_on dátumtól érvényes.
     *   - A rutin minden héten az eredeti day_of_week napon ismétlődik.
     *   - A created_on-tól számított első előfordulás a "0."; egy kivétel
     *     az első `occurrences` darab előfordulásra vonatkozik.
     *   - Egy adott $date akkor esik a kivétel hatálya alá, ha:
     *       * $date >= created_on
     *       * a created_on és $date közötti, az érintett day_of_week-re
     *         eső előfordulások száma (1-alapú index) <= occurrences
     *       * valid_until (ha van) >= $date
     *
     *  Megjegyzés: az "érintett nap" az eredeti routine_items.day_of_week,
     *  mert az előfordulásokat az eredeti ütemezés szerint számoljuk –
     *  a kivétel ezután átteheti másik napra / időre / lemondhatja.
     * ================================================================= */
    private function getActiveExceptionForDate($routineItem, $dateStr) {
        $stmt = $this->pdo->prepare("
            SELECT *
            FROM routine_exceptions
            WHERE routine_item_id = ?
              AND is_active = 1
              AND created_on <= ?
              AND (valid_until IS NULL OR valid_until >= ?)
            ORDER BY created_on DESC, id DESC
        ");
        $stmt->execute([$routineItem['id'], $dateStr, $dateStr]);
        $candidates = $stmt->fetchAll();
        if (!$candidates) return null;

        $origDow = (int)$routineItem['day_of_week'];

        foreach ($candidates as $ex) {
            // Hány alkalommal fordult elő az EREDETI nap a created_on (azt
            // is beleértve) és a vizsgált $date között, bezárólag?
            $occIndex = $this->occurrenceIndex($ex['created_on'], $dateStr, $origDow);
            if ($occIndex === null) continue;          // $date nem az eredeti napra esik
            if ($occIndex >= 1 && $occIndex <= (int)$ex['occurrences']) {
                return $ex;                            // ez a kivétel vonatkozik rá
            }
        }
        return null;
    }

    /* =================================================================
     *  SEGÉD: az $date hányadik előfordulása az $origDow napnak,
     *  a $fromDate-től (bezárólag) számítva.
     *  Visszatérés:
     *    - int >= 1 : ennyiedik előfordulás
     *    - null     : $date nem az $origDow napra esik, vagy < $fromDate
     * ================================================================= */
    private function occurrenceIndex($fromDate, $date, $origDow) {
        if ($date < $fromDate) return null;
        if ($this->dowForDate($date) !== (int)$origDow) return null;

        $from = new DateTime($fromDate);
        $to   = new DateTime($date);
        $from->setTime(0, 0, 0);
        $to->setTime(0, 0, 0);

        // Az első olyan nap >= $fromDate, ami az origDow-ra esik
        $first = clone $from;
        $diff  = ((int)$origDow - (int)$first->format('N') + 7) % 7;
        if ($diff > 0) $first->modify("+$diff days");

        if ($to < $first) return null;

        $days = (int)$first->diff($to)->days;
        // 7 naponta egy előfordulás; +1, hogy 1-alapú indexet kapjunk
        return intdiv($days, 7) + 1;
    }

    /* =================================================================
     *  SEGÉD: kivétel alkalmazása egy rutin soron (másolaton)
     *  Visszatérés: a (lehetőleg) módosított sor, vagy null ha SKIP.
     * ================================================================= */
    private function applyException($row, $ex) {
        if ($ex === null) return $row;

        if ((int)$ex['is_skip'] === 1) {
            return null; // az adott alkalom elmarad
        }
        if (!empty($ex['new_start_time'])) $row['start_time'] = $ex['new_start_time'];
        if (!empty($ex['new_end_time']))   $row['end_time']   = $ex['new_end_time'];
        if (!empty($ex['new_day_of_week'])) $row['day_of_week'] = (int)$ex['new_day_of_week'];

        // Jelöljük, hogy ezen az alkalmon kivétel van érvényben (frontend)
        $row['exception_active'] = true;
        $row['exception_id']     = (int)$ex['id'];
        return $row;
    }

    // ===== ÖSSZES RUTIN ELEM LEKÉRÉSE (hét összes napja) =====
    //  Paraméterek (KETTŐ közül egyik adható meg, nem mindkettő):
    //   - $forDate   = 'Y-m-d' : csak az ADOTT NAP rutinjai, kivételek feloldva
    //                  (napi nézethez / mai listához).
    //   - $weekStart = 'Y-m-d' : EGÉSZ HÉT rutinjai, minden rutin a saját
    //                  napjának megfelelő dátumon (week_start + dow-1) kapja
    //                  meg a kivétel-feloldást (heti nézethez).
    //   - mindkettő NULL : nyers ütemezés, kivételek figyelmen kívül
    //                  (szerkesztéshez / rawItems-hez).
    //  Ha egyik sem üres, a $forDate-nek elsőbbsége van.
    public function getAll($forDate = null, $weekStart = null) {
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
        $rows = $stmt->fetchAll();

        // 1) Nyers lista
        if (!$forDate && !$weekStart) {
            return $rows;
        }

        // 2) forDate: csak az adott napra eső rutinok, kivételek feloldva
        if ($forDate) {
            $targetDow = $this->dowForDate($forDate);
            $result = [];
            foreach ($rows as $row) {
                $ex = $this->getActiveExceptionForDate($row, $forDate);
                $applied = $this->applyException($row, $ex);
                if ($applied === null) continue;                 // skip
                if ((int)$applied['day_of_week'] === $targetDow) {
                    $result[] = $applied;
                }
            }
            return $result;
        }

        // 3) weekStart: heti nézet – minden rutin a saját napjához tartozó
        //    konkrét dátumon kapja a kivétel-feloldást.
        //    A weekStart-ot hétfőre normalizáljuk (PHP 'N' formátum: 1=H..7=V).
        $ws = new DateTime($weekStart);
        $ws->setTime(0, 0, 0);
        $wsDow = (int)$ws->format('N');
        if ($wsDow > 1) {
            $ws->modify('-' . ($wsDow - 1) . ' days');           // vissza hétfőre
        }

        $result = [];
        foreach ($rows as $row) {
            $origDow = (int)$row['day_of_week'];
            if ($origDow < 1 || $origDow > 7) continue;

            // Az adott rutinhoz tartozó NAPTÁRI dátum ezen a héten
            $dayDate = clone $ws;
            if ($origDow > 1) {
                $dayDate->modify('+' . ($origDow - 1) . ' days');
            }
            $dayDateStr = $dayDate->format('Y-m-d');

            $ex = $this->getActiveExceptionForDate($row, $dayDateStr);
            $applied = $this->applyException($row, $ex);
            if ($applied === null) continue;                     // skip a héten
            $result[] = $applied;
        }
        return $result;
    }

    // ===== EGY NAP RUTIN ELEMEINEK LEKÉRÉSE =====
    //  $forDate: opcionális konkrét dátum a kivételek feloldásához.
    //  Ha nincs megadva, a nyers (kivétel nélküli) heti ütemezést adja.
    public function getByDay($dayOfWeek, $forDate = null) {
        if (!$forDate) {
            $sql = "
                SELECT
                    ri.id, ri.title, ri.type, ri.category_id, ri.day_of_week,
                    ri.start_time, ri.end_time, ri.color_hex,
                    c.name AS category_name, c.color_hex AS category_color
                FROM routine_items ri
                LEFT JOIN categories c ON ri.category_id = c.id
                WHERE ri.day_of_week = ?
                ORDER BY ri.start_time ASC
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$dayOfWeek]);
            return $stmt->fetchAll();
        }

        // forDate megadva → minden rutint vizsgálunk (egy másik napról
        // áthúzott kivétel is ide eshet), és a feloldott day_of_week
        // alapján szűrünk a kért napra.
        $all = $this->getAll($forDate);
        $targetDow = (int)$dayOfWeek;
        $filtered = array_values(array_filter($all, function ($r) use ($targetDow) {
            return (int)$r['day_of_week'] === $targetDow;
        }));
        usort($filtered, function ($a, $b) {
            return strcmp($a['start_time'], $b['start_time']);
        });
        return $filtered;
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
        // A routine_exceptions ON DELETE CASCADE miatt automatikusan törlődik.
        $stmt = $this->pdo->prepare("DELETE FROM routine_items WHERE id = ?");
        $stmt->execute([$id]);
        return ["message" => "Rutin elem sikeresen törölve!"];
    }

    /* =================================================================
     *  ===== KIVÉTELEK (routine_exceptions) =====
     * ================================================================= */

    // ----- Egy rutin összes kivételének lekérése -----
    public function getExceptions($routineItemId) {
        if (empty($routineItemId)) {
            throw new Exception("Hiányzó rutin azonosító!");
        }
        $stmt = $this->pdo->prepare("
            SELECT *
            FROM routine_exceptions
            WHERE routine_item_id = ?
            ORDER BY is_active DESC, created_on DESC, id DESC
        ");
        $stmt->execute([$routineItemId]);
        $rows = $stmt->fetchAll();

        // Kényelmi mező: hány alkalom telt el már (audit/megjelenítés)
        foreach ($rows as &$r) {
            $r['used'] = (int)$r['occurrences'] - (int)$r['remaining'];
        }
        return $rows;
    }

    // ----- Új kivétel létrehozása -----
    //  Elvárt mezők:
    //   - routine_item_id (kötelező)
    //   - occurrences     (kötelező, >=1) – hány alkalomra szól
    //   - is_skip         (0/1) – lemondás
    //   - new_day_of_week (NULL vagy 1-7) – másik napra húzás
    //   - new_start_time  (NULL vagy HH:MM[:SS])
    //   - new_end_time    (NULL vagy HH:MM[:SS])
    //   - created_on      (opcionális, alap = ma) – ettől számoljuk az N-t
    public function createException($data) {
        $routineItemId = (int)($data['routine_item_id'] ?? 0);
        if ($routineItemId <= 0) {
            throw new Exception("Hiányzó vagy érvénytelen rutin azonosító!");
        }

        // Ellenőrizzük, hogy a rutin létezik (és lekérjük az eredeti napot)
        $ri = $this->getOne($routineItemId);
        if (!$ri) {
            throw new Exception("A megadott rutin nem létezik!");
        }

        $occurrences = (int)($data['occurrences'] ?? 1);
        if ($occurrences < 1) {
            throw new Exception("Az alkalmak száma legalább 1 legyen!");
        }

        $isSkip = !empty($data['is_skip']) ? 1 : 0;

        $newDow = null;
        if (isset($data['new_day_of_week']) && $data['new_day_of_week'] !== '' && $data['new_day_of_week'] !== null) {
            $newDow = (int)$data['new_day_of_week'];
            if ($newDow < 1 || $newDow > 7) {
                throw new Exception("Érvénytelen cél nap (1-7)!");
            }
        }

        $newStart = !empty($data['new_start_time']) ? $data['new_start_time'] : null;
        $newEnd   = !empty($data['new_end_time'])   ? $data['new_end_time']   : null;

        // Ha nem skip, akkor legyen legalább egy tényleges módosítás
        if (!$isSkip && $newDow === null && $newStart === null && $newEnd === null) {
            throw new Exception("Add meg legalább az új időpontot, napot, vagy jelöld lemondásnak!");
        }

        $createdOn = !empty($data['created_on'])
            ? date('Y-m-d', strtotime($data['created_on']))
            : date('Y-m-d');

        $validUntil = !empty($data['valid_until'])
            ? date('Y-m-d', strtotime($data['valid_until']))
            : null;

        $stmt = $this->pdo->prepare("
            INSERT INTO routine_exceptions
                (routine_item_id, created_on, occurrences, remaining, is_skip,
                 new_day_of_week, new_start_time, new_end_time, is_active, valid_until)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ");
        $stmt->execute([
            $routineItemId, $createdOn, $occurrences, $occurrences, $isSkip,
            $newDow, $newStart, $newEnd, $validUntil
        ]);

        return [
            "message" => "Kivétel sikeresen létrehozva!",
            "id" => (int)$this->pdo->lastInsertId()
        ];
    }

    // ----- Kivétel frissítése -----
    public function updateException($data) {
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            throw new Exception("Hiányzó kivétel azonosító!");
        }

        $fields = [];
        $values = [];

        if (isset($data['occurrences'])) {
            $occ = (int)$data['occurrences'];
            if ($occ < 1) throw new Exception("Az alkalmak száma legalább 1 legyen!");
            $fields[] = "occurrences = ?"; $values[] = $occ;
        }
        if (isset($data['remaining'])) {
            $fields[] = "remaining = ?"; $values[] = max(0, (int)$data['remaining']);
        }
        if (isset($data['is_skip'])) {
            $fields[] = "is_skip = ?"; $values[] = !empty($data['is_skip']) ? 1 : 0;
        }
        if (array_key_exists('new_day_of_week', $data)) {
            $v = $data['new_day_of_week'];
            $fields[] = "new_day_of_week = ?";
            $values[] = ($v === '' || $v === null) ? null : (int)$v;
        }
        if (array_key_exists('new_start_time', $data)) {
            $fields[] = "new_start_time = ?";
            $values[] = !empty($data['new_start_time']) ? $data['new_start_time'] : null;
        }
        if (array_key_exists('new_end_time', $data)) {
            $fields[] = "new_end_time = ?";
            $values[] = !empty($data['new_end_time']) ? $data['new_end_time'] : null;
        }
        if (isset($data['is_active'])) {
            $fields[] = "is_active = ?"; $values[] = !empty($data['is_active']) ? 1 : 0;
        }
        if (array_key_exists('valid_until', $data)) {
            $fields[] = "valid_until = ?";
            $values[] = !empty($data['valid_until']) ? date('Y-m-d', strtotime($data['valid_until'])) : null;
        }

        if (empty($fields)) {
            throw new Exception("Nincs frissítendő mező!");
        }

        $values[] = $id;
        $sql = "UPDATE routine_exceptions SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);

        return ["message" => "Kivétel sikeresen frissítve!"];
    }

    // ----- Kivétel deaktiválása (audit célból marad a DB-ben) -----
    public function deactivateException($id) {
        $id = (int)$id;
        if ($id <= 0) {
            throw new Exception("Hiányzó kivétel azonosító!");
        }
        $stmt = $this->pdo->prepare("UPDATE routine_exceptions SET is_active = 0 WHERE id = ?");
        $stmt->execute([$id]);
        return ["message" => "Kivétel deaktiválva (előzményként megmarad)."];
    }

    // ----- Kivétel végleges törlése -----
    public function deleteException($id) {
        $id = (int)$id;
        if ($id <= 0) {
            throw new Exception("Hiányzó kivétel azonosító!");
        }
        $stmt = $this->pdo->prepare("DELETE FROM routine_exceptions WHERE id = ?");
        $stmt->execute([$id]);
        return ["message" => "Kivétel véglegesen törölve!"];
    }

    /* -----------------------------------------------------------------
     *  Karbantartás: lejárt kivételek deaktiválása.
     *  Egy kivétel "lejárt", ha:
     *    - valid_until < ma,  VAGY
     *    - a created_on óta az eredeti napon már eltelt >= occurrences
     *      előfordulás (azaz a mai napig már nincs hátralévő alkalom).
     *  A rekord NEM törlődik, csak is_active = 0 lesz (audit).
     *  Érdemes a getAll/getCompletions hívások előtt, vagy cron-ból futtatni.
     * ----------------------------------------------------------------- */
    public function deactivateExpiredExceptions() {
        $today = date('Y-m-d');

        // 1) valid_until alapján lejártak
        $this->pdo->prepare("
            UPDATE routine_exceptions
            SET is_active = 0
            WHERE is_active = 1
              AND valid_until IS NOT NULL
              AND valid_until < ?
        ")->execute([$today]);

        // 2) Előfordulás-szám alapján lejártak (created_on .. ma)
        $stmt = $this->pdo->query("
            SELECT rex.id, rex.created_on, rex.occurrences, ri.day_of_week
            FROM routine_exceptions rex
            JOIN routine_items ri ON ri.id = rex.routine_item_id
            WHERE rex.is_active = 1
        ");
        $expiredIds = [];
        foreach ($stmt->fetchAll() as $row) {
            $idx = $this->occurrenceIndex($row['created_on'], $today, (int)$row['day_of_week']);
            // Ha a mai napig vett előfordulások száma már meghaladta az N-t,
            // és ma már nem az érintett nap → lejárt.
            // Egyszerűsített, biztonságos feltétel: ha a created_on-tól ELTELT
            // teljes hetek száma alapján a következő alkalom indexe > occurrences.
            $from = new DateTime($row['created_on']);
            $now  = new DateTime($today);
            $from->setTime(0,0,0); $now->setTime(0,0,0);
            if ($now < $from) continue;
            $weeksPassed = intdiv((int)$from->diff($now)->days, 7);
            if ($weeksPassed >= (int)$row['occurrences']) {
                $expiredIds[] = (int)$row['id'];
            }
        }
        if ($expiredIds) {
            $in = implode(',', array_fill(0, count($expiredIds), '?'));
            $this->pdo->prepare("UPDATE routine_exceptions SET is_active = 0 WHERE id IN ($in)")
                      ->execute($expiredIds);
        }

        return ["message" => "Lejárt kivételek deaktiválva.", "deactivated" => count($expiredIds)];
    }

    // ===== TELJESÍTÉS PIPÁLÁSA (TOGGLE) =====
    public function toggleCompletion($routineItemId, $date) {
        if (empty($routineItemId) || empty($date)) {
            throw new Exception("Hiányzó azonosító vagy dátum!");
        }

        $checkStmt = $this->pdo->prepare("
            SELECT id FROM routine_completions
            WHERE routine_item_id = ? AND completed_date = ?
        ");
        $checkStmt->execute([$routineItemId, $date]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            $this->pdo->prepare("DELETE FROM routine_completions WHERE id = ?")->execute([$existing['id']]);
            return ["message" => "Teljesítés visszavonva!", "completed" => false];
        } else {
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

        $totalStmt = $this->pdo->query("
            SELECT day_of_week, COUNT(*) as total FROM routine_items GROUP BY day_of_week
        ");
        $totals = [];
        foreach ($totalStmt->fetchAll() as $row) {
            $totals[$row['day_of_week']] = (int)$row['total'];
        }

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
