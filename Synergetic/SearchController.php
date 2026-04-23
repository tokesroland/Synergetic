<?php
/**
 * SearchController v2
 * + category_ids szűrő
 */
require_once 'config.php';

class SearchController {
    private $pdo;

    public function __construct() {
        global $host, $dbname, $username, $password;
        $this->pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    public function search($filters) {
        $conditions = [];
        $params = [];
        $joins = [];

        $baseJoins = "
            LEFT JOIN todo_details td ON e.id = td.entry_id AND e.type = 'todo'
            LEFT JOIN event_details ed ON e.id = ed.entry_id AND e.type = 'event'
            LEFT JOIN locations l ON ed.location_id = l.id
        ";

        // Csoport
        if (!empty($filters['group_id'])) {
            $conditions[] = "e.group_id = ?";
            $params[] = (int)$filters['group_id'];
        }

        // Több csoport
        if (!empty($filters['group_ids']) && is_array($filters['group_ids'])) {
            $ph = implode(',', array_fill(0, count($filters['group_ids']), '?'));
            $conditions[] = "e.group_id IN ($ph)";
            foreach ($filters['group_ids'] as $gid) $params[] = (int)$gid;
        }

        // Típus
        if (!empty($filters['types']) && is_array($filters['types'])) {
            $valid = array_intersect($filters['types'], ['todo', 'event', 'note']);
            if (!empty($valid)) {
                $ph = implode(',', array_fill(0, count($valid), '?'));
                $conditions[] = "e.type IN ($ph)";
                foreach ($valid as $t) $params[] = $t;
            }
        }

        // Cím
        if (!empty($filters['title'])) {
            $conditions[] = "e.title LIKE ?";
            $params[] = '%' . $filters['title'] . '%';
        }

        // Tartalom
        if (!empty($filters['content'])) {
            $conditions[] = "(e.content LIKE ? OR e.title LIKE ?)";
            $params[] = '%' . $filters['content'] . '%';
            $params[] = '%' . $filters['content'] . '%';
        }

        // Kategória
        if (!empty($filters['category_ids']) && is_array($filters['category_ids'])) {
            $ph = implode(',', array_fill(0, count($filters['category_ids']), '?'));
            $conditions[] = "e.category_id IN ($ph)";
            foreach ($filters['category_ids'] as $cid) $params[] = (int)$cid;
        }

        // Tag – EITHER logic: legalább egy tag-ot kell tartalmaznia
        if (!empty($filters['tag_ids']) && is_array($filters['tag_ids'])) {
            $ph = implode(',', array_fill(0, count($filters['tag_ids']), '?'));
            $joins[] = "INNER JOIN entry_tags et_filter ON e.id = et_filter.entry_id AND et_filter.tag_id IN ($ph)";
            foreach ($filters['tag_ids'] as $tid) $params[] = (int)$tid;
        }

        // Dátum
        $dateCol = 'e.created_at';
        if (!empty($filters['date_type']) && $filters['date_type'] === 'updated_at') $dateCol = 'e.updated_at';
        if (!empty($filters['date_from'])) { $conditions[] = "$dateCol >= ?"; $params[] = $filters['date_from']; }
        if (!empty($filters['date_to'])) { $conditions[] = "$dateCol <= ?"; $params[] = $filters['date_to'] . ' 23:59:59'; }

        // Helyszín
        if (!empty($filters['location_ids']) && is_array($filters['location_ids'])) {
            $ph = implode(',', array_fill(0, count($filters['location_ids']), '?'));
            $conditions[] = "ed.location_id IN ($ph)";
            foreach ($filters['location_ids'] as $lid) $params[] = (int)$lid;
        }

        if (!empty($filters['todo_statuses']) && is_array($filters['todo_statuses'])) {
            $statusConds = [];
            $regular = array_intersect($filters['todo_statuses'], ['active', 'completed', 'archived']);
            if (!empty($regular)) {
                $ph = implode(',', array_fill(0, count($regular), '?'));
                $statusConds[] = "(e.type = 'todo' AND td.status IN ($ph))";
                foreach ($regular as $s) $params[] = $s;
            }
            if (in_array('upcoming', $filters['todo_statuses'])) {
                $statusConds[] = "(e.type = 'todo' AND td.deadline IS NOT NULL AND td.deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 48 HOUR))";
            }
            if (!empty($statusConds)) $conditions[] = "(" . implode(" OR ", $statusConds) . ")";
        }

        // Csatolmány típus
        if (!empty($filters['attachment_types']) && is_array($filters['attachment_types'])) {
            $mimeMap = [
                'image' => ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/svg+xml'],
                'video' => ['video/mp4','video/webm','video/ogg','video/quicktime'],
                'document' => ['application/pdf','text/plain','text/csv','text/markdown'],
                'audio' => ['audio/mpeg','audio/ogg','audio/wav','audio/webm'],
            ];
            $mimes = [];
            foreach ($filters['attachment_types'] as $at) { if (isset($mimeMap[$at])) $mimes = array_merge($mimes, $mimeMap[$at]); }
            if (!empty($mimes)) {
                $ph = implode(',', array_fill(0, count($mimes), '?'));
                $joins[] = "INNER JOIN attachments att_filter ON e.id = att_filter.entry_id AND att_filter.file_type IN ($ph)";
                foreach ($mimes as $mt) $params[] = $mt;
            }
        }

        $joinStr = $baseJoins . "\n" . implode("\n", $joins);
        $whereStr = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        $orderDir = (!empty($filters['date_order']) && strtoupper($filters['date_order']) === 'ASC') ? 'ASC' : 'DESC';

        $sql = "
            SELECT DISTINCT e.id, e.type, e.title, e.content, e.category_id, e.group_id,
                e.pos_x AS x, e.pos_y AS y, e.created_at, e.updated_at,
                td.status AS todo_status, td.planned_start AS todo_planned_start, td.deadline AS todo_deadline,
                ed.start_datetime AS event_start_datetime, ed.end_datetime AS event_end_datetime,
                ed.location_id, l.name AS location_name
            FROM entries e $joinStr $whereStr
            ORDER BY $dateCol $orderDir
        ";

        // DEBUG tag szűréshez
        if (!empty($filters['tag_ids'])) {
            error_log("### TAG FILTER DEBUG ###");
            error_log("Kapott tag_ids: " . json_encode($filters['tag_ids']));
            error_log("SQL Query:\n" . $sql);
            error_log("Query Parameters: " . json_encode($params));
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $entries = $stmt->fetchAll();

        // DEBUG: Eredmények száma
        if (!empty($filters['tag_ids'])) {
            error_log("Keresési eredmények száma: " . count($entries));
            error_log("Eredmények: " . json_encode($entries));
        }

        if (!empty($entries)) {
            $entryIds = array_column($entries, 'id');
            $inQ = implode(',', array_fill(0, count($entryIds), '?'));

            // Tagek
            $tagStmt = $this->pdo->prepare("SELECT et.entry_id, t.id, t.name, t.color_hex FROM entry_tags et JOIN tags t ON et.tag_id = t.id WHERE et.entry_id IN ($inQ)");
            $tagStmt->execute($entryIds);
            $tagMap = [];
            foreach ($tagStmt->fetchAll() as $r) $tagMap[$r['entry_id']][] = ['id'=>$r['id'],'name'=>$r['name'],'color_hex'=>$r['color_hex']];

            // Links
            $linkStmt = $this->pdo->prepare("SELECT source_id, target_id FROM entry_links WHERE source_id IN ($inQ) OR target_id IN ($inQ)");
            $linkStmt->execute(array_merge($entryIds, $entryIds));
            $linksMap = [];
            foreach ($linkStmt->fetchAll() as $lk) { $linksMap[$lk['source_id']][] = $lk['target_id']; $linksMap[$lk['target_id']][] = $lk['source_id']; }

            foreach ($entries as &$entry) {
                $entry['x'] = (float)$entry['x'];
                $entry['y'] = (float)$entry['y'];
                $entry['tags'] = $tagMap[$entry['id']] ?? [];
                $entry['links'] = isset($linksMap[$entry['id']]) ? array_values(array_unique($linksMap[$entry['id']])) : [];
            }
        }

        return ['entries' => $entries, 'total' => count($entries)];
    }

    public function getAttachmentTypes() {
        $types = $this->pdo->query("SELECT DISTINCT file_type FROM attachments ORDER BY file_type ASC")->fetchAll(PDO::FETCH_COLUMN);
        $cats = [];
        foreach ($types as $m) {
            if (str_starts_with($m, 'image/')) $cats['image'] = true;
            elseif (str_starts_with($m, 'video/')) $cats['video'] = true;
            elseif (str_starts_with($m, 'audio/')) $cats['audio'] = true;
            else $cats['document'] = true;
        }
        return ['mime_types' => $types, 'categories' => array_keys($cats)];
    }
}
