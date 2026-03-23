<?php
// api.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'EntryController.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"), true);
$controller = new EntryController();

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] == 'get_groups') {
                // Csoportok lekérése statisztikákkal
                echo json_encode($controller->getGroups());
            } elseif (isset($_GET['action']) && $_GET['action'] == 'get_calendar') {
                // ÚJ: Naptár lekérés
                echo json_encode($controller->getCalendarEntries());
            } elseif (isset($_GET['entry_id'])) {
                // Egy konkrét elem lekérése a részletes nézethez
                $result = $controller->getOne($_GET['entry_id']);
                if (!$result) {
                    http_response_code(404);
                    echo json_encode(["error" => "Nem található"]);
                } else {
                    echo json_encode($result);
                }
            } else {
                // Csoport elemeinek listázása a gráfhoz
                $groupId = $_GET['group_id'] ?? 1;
                echo json_encode($controller->getAllByGroup($groupId));
            }
            break;
        case 'POST':
            // Új elem létrehozása
            echo json_encode($controller->create($input));
            break;

        case 'PUT':
            // Meglévő elem frissítése (mentés a details oldalon)
            echo json_encode($controller->update($input));
            break;

        case 'OPTIONS':
            // Pre-flight kérések kezelése (CORS miatt)
            http_response_code(200);
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Módszer nem engedélyezett"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}